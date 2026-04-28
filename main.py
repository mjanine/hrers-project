import os
import csv
from collections import defaultdict

from io import StringIO

from datetime import date, datetime, timedelta
from pathlib import Path
from decimal import Decimal, InvalidOperation

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from auth import authenticate_user, create_access_token, get_current_user, hash_password, require_roles
from database import Base, engine, get_db
from models import (
    AuditLog,
    AttendanceRecord,
    AttendanceStatus,
    Department,
    EmploymentHistory,
    LeaveRequest,
    LeaveStatus,
    ProfileDocument,
    UserProfile,
    PositionChangeRequest,
    PositionChangeStatus,
    TrainingRegistration,
    TrainingSession,
    TrainingStatus,
    User,
    UserRole,
)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_no: str | None = None
    full_name: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    must_change_password: bool


app = FastAPI(title="HRERS User Accounts")

base_dir = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(base_dir / "templates"))
app.mount("/static", StaticFiles(directory=str(base_dir / "static")), name="static")

ROLE_TO_SECTIONS = {
    UserRole.admin: {"admin"},
    UserRole.school_director: {"sd"},
    UserRole.hr_evaluator: {"hr"},
    UserRole.hr_head: {"hr"},
    UserRole.department_head: {"head"},
    UserRole.employee: {"employee"},
}

PUBLIC_SECTIONS = {"login", "application", "accounts"}


def ensure_role_access(section: str, role: UserRole) -> None:
    if section in PUBLIC_SECTIONS:
        return

    allowed_sections = ROLE_TO_SECTIONS.get(role, set())
    if section not in allowed_sections:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Page not allowed for this role")


def resolve_prefixed_section(filename: str) -> str | None:
    if "_" not in filename:
        return None
    prefix = filename.split("_", 1)[0]
    return {"emp": "employee", "hr": "hr", "head": "head", "sd": "sd", "admin": "admin"}.get(prefix)


def render_role_page(request: Request, section: str, filename: str) -> HTMLResponse:
    template_path = base_dir / "templates" / section / filename
    if not template_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    html = template_path.read_text(encoding="utf-8")
    script_tag = '<script src="/static/js/app_nav_guard.js"></script>'
    if script_tag not in html:
        if "</body>" in html:
            html = html.replace("</body>", f"    {script_tag}\n</body>")
        else:
            html += f"\n{script_tag}\n"

    return HTMLResponse(content=html)


ROLE_ALIAS = {
    "admin": UserRole.admin,
    "school_director": UserRole.school_director,
    "sd": UserRole.school_director,
    "hr": UserRole.hr_head,
    "hr_head": UserRole.hr_head,
    "hr_evaluator": UserRole.hr_evaluator,
    "head": UserRole.department_head,
    "department_head": UserRole.department_head,
    "employee": UserRole.employee,
}


def normalize_role(raw_role: str | None) -> UserRole:
    key = (raw_role or "").strip().lower()
    role = ROLE_ALIAS.get(key)
    if role is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    return role


def split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def normalize_document_status(raw_status: str | None) -> str:
    status_value = str(raw_status or "Submitted").strip()
    return status_value or "Submitted"


def document_needs_attention(status_value: str | None) -> bool:
    lowered = str(status_value or "").strip().lower()
    return any(
        token in lowered
        for token in (
            "outdated",
            "renew",
            "expired",
            "missing",
            "request",
            "update",
        )
    )


def profile_document_to_payload(document: ProfileDocument) -> dict[str, str | None]:
    return {
        "id": int(document.id),
        "name": str(document.document_name or "Document"),
        "type": str(document.document_type or "FILE").upper(),
        "status": normalize_document_status(document.status),
        "dateUploaded": document.uploaded_at.strftime("%B %d, %Y") if document.uploaded_at else "--",
        "url": f"/api/profile/documents/{int(document.id)}/download",
        "reviewedBy": str(document.reviewed_by_name or ""),
        "reviewNotes": str(document.review_notes or ""),
        "reviewedAt": document.reviewed_at.isoformat() if document.reviewed_at else None,
    }


def build_profile_payload(current_user: User, db: Session) -> dict[str, str | bool]:
    latest_position = (
        db.query(PositionChangeRequest)
        .filter(PositionChangeRequest.requester_user_id == int(current_user.id))
        .order_by(PositionChangeRequest.created_at.desc(), PositionChangeRequest.id.desc())
        .first()
    )

    first_name, last_name = split_name(str(current_user.full_name))
    role_label = str(current_user.role.value).replace("_", " ").title()

    department_name = ""
    position_name = ""

    if latest_position:
        department_name = str(latest_position.current_department or "")
        position_name = str(latest_position.current_position or "")

    if not department_name and current_user.role == UserRole.department_head:
        head_department = db.query(Department).filter(Department.head_user_id == int(current_user.id), Department.is_active == True).first()
        if head_department:
            department_name = str(head_department.name)

    if not department_name:
        department_name = "General"

    if not position_name:
        position_name = role_label

    user_profile = db.query(UserProfile).filter(UserProfile.user_id == int(current_user.id)).first()

    profile_document_rows = (
        db.query(ProfileDocument)
        .filter(ProfileDocument.user_id == int(current_user.id))
        .order_by(ProfileDocument.uploaded_at.desc(), ProfileDocument.id.desc())
        .all()
    )

    documents: list[dict[str, str | None]] = [profile_document_to_payload(item) for item in profile_document_rows]
    document_alerts = [
        {
            "id": int(item.id),
            "name": str(item.document_name or "Document"),
            "status": normalize_document_status(item.status),
            "message": f"{str(item.document_name or 'Document')} is {normalize_document_status(item.status).lower()} and needs your attention.",
        }
        for item in profile_document_rows
        if document_needs_attention(item.status)
    ]

    history_rows = (
        db.query(EmploymentHistory)
        .filter(EmploymentHistory.user_id == int(current_user.id))
        .order_by(EmploymentHistory.event_date.desc(), EmploymentHistory.id.desc())
        .all()
    )

    history: list[dict[str, str]] = []
    for item in history_rows:
        history.append(
            {
                "date": item.event_date.strftime("%Y") if item.event_date else "--",
                "title": str(item.event_title or "History Event"),
                "description": str(item.event_description or "--"),
            }
        )

    if not history and current_user.created_at:
        history.append(
            {
                "date": current_user.created_at.strftime("%Y"),
                "title": "Hired",
                "description": f"Joined as {position_name}",
            }
        )

    return {
        "id": int(current_user.id),
        "employeeNo": str(current_user.employee_no or ""),
        "fullName": str(current_user.full_name),
        "firstName": first_name,
        "lastName": last_name,
        "email": str(current_user.email),
        "role": str(current_user.role.value),
        "roleLabel": role_label,
        "department": department_name,
        "position": position_name,
        "isActive": bool(current_user.is_active),
        "employmentType": "",
        "dateHired": current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "",
        "contactNumber": str(user_profile.contact_number or "") if user_profile else "",
        "address": str(user_profile.address or "") if user_profile else "",
        "emergencyName": str(user_profile.emergency_name or "") if user_profile else "",
        "emergencyPhone": str(user_profile.emergency_phone or "") if user_profile else "",
        "documents": documents,
        "history": history,
        "documentAlerts": document_alerts,
        "documentAlertCount": len(document_alerts),
    }


def build_employee_directory_payload(user: User, db: Session) -> dict:
    latest_position = (
        db.query(PositionChangeRequest)
        .filter(PositionChangeRequest.requester_user_id == int(user.id))
        .order_by(PositionChangeRequest.created_at.desc(), PositionChangeRequest.id.desc())
        .first()
    )

    department_name = "General"
    position_name = str(user.role.value).replace("_", " ").title()

    if user.role == UserRole.department_head:
        head_department = db.query(Department).filter(Department.head_user_id == int(user.id), Department.is_active == True).first()
        if head_department:
            department_name = str(head_department.name)
    elif latest_position:
        department_name = str(latest_position.current_department or department_name)
        position_name = str(latest_position.current_position or position_name)

    return {
        "id": int(user.id),
        "employeeNo": str(user.employee_no or f"EMP-{int(user.id):04d}"),
        "fullName": str(user.full_name),
        "department": department_name,
        "position": position_name,
        "isActive": bool(user.is_active),
        "employmentType": "Full-time",
        "dateHired": user.created_at.strftime("%B %d, %Y") if user.created_at else "",
        "email": str(user.email),
        "contactNumber": "",
        "address": "",
        "roleLabel": str(user.role.value).replace("_", " ").title(),
        "documents": [],
        "history": [],
    }


def build_employee_detail_payload(user: User, db: Session) -> dict[str, str | bool | int | None]:
    latest_position = (
        db.query(PositionChangeRequest)
        .filter(PositionChangeRequest.requester_user_id == int(user.id))
        .order_by(PositionChangeRequest.created_at.desc(), PositionChangeRequest.id.desc())
        .first()
    )

    if user.role == UserRole.department_head:
        head_department = db.query(Department).filter(Department.head_user_id == int(user.id), Department.is_active == True).first()
        department_name = str(head_department.name) if head_department else "General"
    else:
        department_name = str((latest_position.current_department if latest_position else None) or "General")

    position_name = str((latest_position.current_position if latest_position and latest_position.current_position else None) or str(user.role.value).replace("_", " ").title())

    return {
        "id": int(user.id),
        "employeeNo": str(user.employee_no or f"EMP-{int(user.id):03d}"),
        "fullName": str(user.full_name),
        "firstName": split_name(str(user.full_name))[0],
        "lastName": split_name(str(user.full_name))[1],
        "email": str(user.email),
        "role": str(user.role.value),
        "roleLabel": str(user.role.value).replace("_", " ").title(),
        "department": department_name,
        "position": position_name,
        "isActive": bool(user.is_active),
        "employmentType": "Full-time",
        "dateHired": user.created_at.strftime("%B %d, %Y") if user.created_at else "",
        "contactNumber": "",
        "address": "",
        "emergencyName": "",
        "emergencyPhone": "",
    }


def build_universal_user_payload(user: User, db: Session) -> dict[str, str | bool | int | None]:
    payload = build_employee_detail_payload(user, db)
    payload["name"] = str(user.full_name)
    payload["full_name"] = str(user.full_name)
    payload["employee_no"] = str(user.employee_no or payload.get("employeeNo") or "")
    return payload


def get_sick_leave_credits(db: Session, user_id: int, total_credits: int = 15) -> dict[str, int]:
    approved_sick_days = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.requester_user_id == int(user_id),
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.leave_type.ilike("%sick%"),
        )
        .all()
    )

    used_days = sum(int(item.num_days or 0) for item in approved_sick_days)
    remaining = max(0, int(total_credits) - int(used_days))
    return {
        "total": int(total_credits),
        "used": int(used_days),
        "remaining": int(remaining),
    }


def parse_user_ids(raw_user_ids: list[str]) -> list[int]:
    user_ids: list[int] = []
    for raw in raw_user_ids:
        try:
            user_ids.append(int(raw))
        except (TypeError, ValueError):
            continue
    return user_ids


def parse_iso_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format") from exc


def normalize_status_type(value: str | None) -> str:
    status_value = str(value or "").strip().lower()
    if status_value not in {"success", "warning", "failed"}:
        return "success"
    return status_value


def create_audit_log(
    db: Session,
    *,
    activity_type: str,
    activity_label: str,
    status_type: str = "success",
    description: str | None = None,
    user: User | None = None,
    actor: User | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    login_time: datetime | None = None,
    logout_time: datetime | None = None,
    occurred_at: datetime | None = None,
) -> None:
    log = AuditLog(
        user_id=int(user.id) if user else None,
        username=str(user.username) if user else None,
        email=str(user.email) if user else None,
        actor_user_id=int(actor.id) if actor else None,
        actor_name=str(actor.full_name) if actor else (str(user.full_name) if user else None),
        activity_type=str(activity_type).strip().lower(),
        activity_label=str(activity_label).strip() or "Activity",
        status_type=normalize_status_type(status_type),
        description=(str(description).strip() if description else None),
        ip_address=str(ip_address).strip() if ip_address else None,
        user_agent=(str(user_agent).strip()[:255] if user_agent else None),
        login_time=login_time,
        logout_time=logout_time,
        occurred_at=occurred_at or datetime.now(),
    )
    db.add(log)


def to_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def can_review_leave(current_user: User, leave_request: LeaveRequest) -> bool:
    if current_user.id == leave_request.requester_user_id:
        return False

    role = current_user.role
    if role in {UserRole.hr_evaluator, UserRole.hr_head, UserRole.school_director, UserRole.department_head}:
        return True
    return False


def can_review_position_request(current_user: User, position_request: PositionChangeRequest) -> bool:
    if current_user.id == position_request.requester_user_id:
        return False

    return current_user.role in {
        UserRole.hr_evaluator,
        UserRole.hr_head,
        UserRole.school_director,
        UserRole.department_head,
    }


def leave_to_payload(item: LeaveRequest) -> dict:
    return {
        "id": item.id,
        "name": item.requester_name,
        "role": item.requester_role,
        "dateFiled": item.created_at.strftime("%B %d, %Y") if item.created_at else "",
        "submitTime": item.created_at.strftime("%I:%M %p") if item.created_at else "",
        "leaveType": item.leave_type,
        "startDate": item.start_date.isoformat(),
        "endDate": item.end_date.isoformat(),
        "numDays": item.num_days,
        "status": item.status.value,
        "reviewedBy": item.reviewed_by_name or "---",
        "reason": item.reason,
        "fileName": item.file_name or "No Document Attached",
        "reviewRemarks": item.review_remarks or "Awaiting review.",
    }


def position_change_to_payload(item: PositionChangeRequest) -> dict:
    return {
        "id": item.id,
        "employeeName": item.employee_name,
        "employeeId": item.employee_no or "",
        "currentPosition": item.current_position or "",
        "currentDepartment": item.current_department or "",
        "requestedPosition": item.requested_position,
        "effectiveDate": item.effective_date.isoformat(),
        "reason": item.reason,
        "status": item.status.value,
        "reviewedBy": item.reviewed_by_name or "---",
        "reviewRemarks": item.review_remarks or "Awaiting review.",
        "submittedAt": item.created_at.isoformat() if item.created_at else "",
    }


def training_session_to_payload(item: TrainingSession, registration_count: int | None = None) -> dict:
    total_slots = int(item.total_slots or 0)
    filled_slots = int(registration_count if registration_count is not None else item.filled_slots or 0)
    if item.status == TrainingStatus.completed:
        progress = "Completed"
    elif item.status == TrainingStatus.cancelled:
        progress = "Session cancelled"
    elif filled_slots >= total_slots and total_slots > 0:
        progress = "At capacity"
    else:
        progress = "Enrollment open"

    return {
        "id": item.id,
        "title": item.title,
        "name": item.title,
        "category": item.category,
        "type": item.training_type,
        "date": item.training_date.strftime("%m/%d/%Y"),
        "isoDate": item.training_date.isoformat(),
        "mode": item.training_type,
        "slotsText": f"{filled_slots} / {total_slots}",
        "filled": filled_slots,
        "total": total_slots,
        "progress": progress,
        "status": item.status.value.lower(),
        "statusLabel": item.status.value,
        "remarks": item.remarks or "",
        "venue": item.location or "",
        "trainer": item.provider or "",
        "description": item.description or "",
        "location": item.location or "",
        "contact": item.contact or "",
    }


def training_registration_to_payload(item: TrainingRegistration, training: TrainingSession) -> dict:
    return {
        "id": item.id,
        "trainingId": training.id,
        "title": training.title,
        "date": training.training_date.strftime("%m/%d/%Y"),
        "type": training.training_type,
        "status": item.status,
    }


def attendance_to_payload(item: AttendanceRecord) -> dict:
    return {
        "id": item.id,
        "userId": item.user_id,
        "recordDate": item.record_date.isoformat(),
        "timeIn": item.time_in.isoformat() if item.time_in else None,
        "timeOut": item.time_out.isoformat() if item.time_out else None,
        "workedSeconds": int(item.worked_seconds or 0),
        "status": item.status.value,
        "notes": item.notes or "",
        "hours": f"{int(item.worked_seconds or 0) // 3600}h {(int(item.worked_seconds or 0) % 3600) // 60:02d}m",
    }


def attendance_summary_payload(record: AttendanceRecord | None) -> dict:
    if not record:
        return {"clockedIn": False, "timeIn": None, "workedSeconds": 0, "status": "Not started"}

    return {
        "clockedIn": record.time_in is not None and record.time_out is None,
        "timeIn": record.time_in.isoformat() if record.time_in else None,
        "workedSeconds": int(record.worked_seconds or 0),
        "status": record.status.value,
    }


def build_weekly_attendance_summary(records: list[AttendanceRecord], offset: int) -> dict:
    target_end = date.today() - timedelta(days=offset * 7)
    target_start = target_end - timedelta(days=6)
    week_records = [record for record in records if target_start <= record.record_date <= target_end]

    rows = []
    current_day = target_start
    while current_day <= target_end:
        record = next((item for item in week_records if item.record_date == current_day), None)
        rows.append(
            {
                "date": current_day.strftime("%B %-d, %Y") if os.name != "nt" else current_day.strftime("%B %#d, %Y"),
                "day": current_day.strftime("%A"),
                "timeIn": record.time_in.strftime("%-I:%M %p") if record and record.time_in and os.name != "nt" else (record.time_in.strftime("%#I:%M %p") if record and record.time_in else "--"),
                "timeOut": record.time_out.strftime("%-I:%M %p") if record and record.time_out and os.name != "nt" else (record.time_out.strftime("%#I:%M %p") if record and record.time_out else "--"),
                "hours": f"{int(record.worked_seconds or 0) // 3600}h {(int(record.worked_seconds or 0) % 3600) // 60:02d}m" if record else "--",
                "status": (record.status.value.lower() if record else ("holiday" if current_day.weekday() >= 5 else "absent")),
            }
        )
        current_day += timedelta(days=1)

    total_seconds = sum(int(record.worked_seconds or 0) for record in week_records)
    return {
        "label": f"{target_start.strftime('%B %-d') if os.name != 'nt' else target_start.strftime('%B %#d')} – {target_end.strftime('%B %-d, %Y') if os.name != 'nt' else target_end.strftime('%B %#d, %Y')}",
        "rows": rows,
        "total": f"{total_seconds // 3600}h {(total_seconds % 3600) // 60:02d}m",
    }


def build_monthly_attendance_summary(records: list[AttendanceRecord], offset: int) -> dict:
    today = date.today()
    month_index = today.month - 1 - offset
    year = today.year + (month_index // 12)
    month = (month_index % 12) + 1
    first_day = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    days_in_month = (next_month - first_day).days
    month_records = [record for record in records if record.record_date.year == year and record.record_date.month == month]
    attendance_map = {}
    total_seconds = 0

    for record in month_records:
        total_seconds += int(record.worked_seconds or 0)
        attendance_map[record.record_date.day] = {
            "status": record.status.value.lower(),
            "hours": f"{int(record.worked_seconds or 0) // 3600}h {(int(record.worked_seconds or 0) % 3600) // 60:02d}m",
        }

    return {
        "label": first_day.strftime("%B %Y"),
        "firstDayOfWeek": first_day.weekday(),
        "daysInMonth": days_in_month,
        "attendance": attendance_map,
        "total": f"{total_seconds // 3600}h {(total_seconds % 3600) // 60:02d}m",
    }

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in cors_origins else cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def root() -> RedirectResponse:
    return RedirectResponse(url="/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login/login.html", {"request": request})


@app.get("/forgot-password", response_class=HTMLResponse)
def forgot_password_page(request: Request):
    return templates.TemplateResponse("login/forpass.html", {"request": request})


@app.get("/change-password", response_class=HTMLResponse)
def change_password_page(request: Request):
    return templates.TemplateResponse("login/changepass.html", {"request": request})


@app.get("/dashboard/admin", response_class=HTMLResponse)
def admin_dashboard_page(request: Request, current_user: User = Depends(require_roles(UserRole.admin))):
    return render_role_page(request, "admin", "dashboard.html")


@app.get("/dashboard/school-director", response_class=HTMLResponse)
def school_director_dashboard_page(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.school_director)),
):
    return render_role_page(request, "sd", "sd_dash.html")


@app.get("/dashboard/hr", response_class=HTMLResponse)
def hr_dashboard_page(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.hr_evaluator, UserRole.hr_head)),
):
    return render_role_page(request, "hr", "hr_dash.html")


@app.get("/dashboard/department-head", response_class=HTMLResponse)
def department_head_dashboard_page(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.department_head)),
):
    return render_role_page(request, "head", "head_dash.html")


@app.get("/dashboard/employee", response_class=HTMLResponse)
def employee_dashboard_page(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.employee)),
):
    return render_role_page(request, "employee", "emp_dash.html")


@app.get("/templates/{section}/{page_name}", response_class=HTMLResponse)
def protected_template_page(
    section: str,
    page_name: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    normalized_name = page_name if page_name.endswith(".html") else f"{page_name}.html"

    # Some existing links point to incorrect folders; resolve by filename prefix when possible.
    candidate_section = section
    candidate_path = base_dir / "templates" / candidate_section / normalized_name
    if not candidate_path.exists():
        prefixed_section = resolve_prefixed_section(normalized_name)
        if prefixed_section:
            candidate_section = prefixed_section
            candidate_path = base_dir / "templates" / candidate_section / normalized_name

    if not candidate_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    ensure_role_access(candidate_section, current_user.role)
    return render_role_page(request, candidate_section, normalized_name)


@app.get("/templates/{page_name}", response_class=HTMLResponse)
def protected_flat_template_page(
    page_name: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    normalized_name = page_name if page_name.endswith(".html") else f"{page_name}.html"
    prefixed_section = resolve_prefixed_section(normalized_name)
    if not prefixed_section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    candidate_path = base_dir / "templates" / prefixed_section / normalized_name
    if not candidate_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    ensure_role_access(prefixed_section, current_user.role)
    return render_role_page(request, prefixed_section, normalized_name)


@app.post("/auth/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        create_audit_log(
            db,
            activity_type="failed_login",
            activity_label="Failed Login",
            status_type="failed",
            description="Invalid username/email or password.",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = str(user.username)
    role = str(user.role.value)
    token = create_access_token(subject=username, role=role)
    response = JSONResponse({"access_token": token, "token_type": "bearer", "role": role})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    create_audit_log(
        db,
        activity_type="login",
        activity_label="Login",
        status_type="success",
        description="User authenticated successfully.",
        user=user,
        actor=user,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        login_time=datetime.now(),
    )
    db.commit()
    return response


@app.get("/auth/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    try:
        current_user = get_current_user(request, db)
    except HTTPException:
        current_user = None

    if current_user:
        create_audit_log(
            db,
            activity_type="logout",
            activity_label="Logout",
            status_type="success",
            description="User signed out.",
            user=current_user,
            actor=current_user,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            logout_time=datetime.now(),
        )
        db.commit()

    response = RedirectResponse(url="/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.delete_cookie("access_token")
    return response


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/profile/me")
def read_profile_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_profile_payload(current_user, db)


@app.post("/api/profile/me")
async def update_profile_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()

    first_name = str(form.get("first_name") or form.get("firstName") or "").strip()
    last_name = str(form.get("last_name") or form.get("lastName") or "").strip()
    email = str(form.get("email") or current_user.email).strip().lower()
    contact_number = str(form.get("contact_number") or form.get("contactNumber") or "").strip()
    address = str(form.get("address") or "").strip()
    emergency_name = str(form.get("emergency_name") or form.get("emergencyName") or "").strip()
    emergency_phone = str(form.get("emergency_phone") or form.get("emergencyPhone") or "").strip()

    if first_name or last_name:
        combined_name = f"{first_name} {last_name}".strip()
        if combined_name:
            current_user.full_name = combined_name

    if email and email != str(current_user.email).lower():
        existing = db.query(User).filter(User.email == email, User.id != int(current_user.id)).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        current_user.email = email

    user_profile = db.query(UserProfile).filter(UserProfile.user_id == int(current_user.id)).first()
    if not user_profile:
        user_profile = UserProfile(user_id=int(current_user.id))
        db.add(user_profile)

    user_profile.contact_number = contact_number or None
    user_profile.address = address or None
    user_profile.emergency_name = emergency_name or None
    user_profile.emergency_phone = emergency_phone or None

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully.", "profile": build_profile_payload(current_user, db)}


@app.post("/api/profile/documents")
async def upload_profile_document(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()
    file = form.get("document_file")
    document_name = str(form.get("document_name") or "").strip()
    document_type = str(form.get("document_type") or "").strip()

    if not getattr(file, "filename", None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a file to upload.")

    safe_original_name = Path(file.filename).name
    document_name = document_name or Path(safe_original_name).stem.replace("_", " ").replace("-", " ").title()
    document_type = document_type or (safe_original_name.rsplit(".", 1)[-1].upper() if "." in safe_original_name else "FILE")

    content = await file.read()
    file_size = len(content)

    document = ProfileDocument(
        user_id=int(current_user.id),
        document_name=document_name,
        document_type=document_type,
        status="Submitted",
        file_content=content,
        file_size=file_size,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return {"message": "Document uploaded successfully.", "document": profile_document_to_payload(document)}


@app.patch("/api/profile/documents/{document_id}")
async def review_profile_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    document = db.query(ProfileDocument).filter(ProfileDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    form = await request.form()
    status_value = normalize_document_status(form.get("status"))
    review_notes = str(form.get("review_notes") or "").strip()

    document.status = status_value
    document.review_notes = review_notes or None
    document.reviewed_by_user_id = int(current_user.id)
    document.reviewed_by_name = str(current_user.full_name)
    document.reviewed_at = datetime.now()

    db.commit()
    db.refresh(document)

    return {"message": "Document updated successfully.", "document": profile_document_to_payload(document)}


@app.get("/api/profile/documents/{document_id}/download")
async def download_profile_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi.responses import StreamingResponse
    
    document = db.query(ProfileDocument).filter(ProfileDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if document.user_id != int(current_user.id) and current_user.role not in (
        UserRole.admin,
        UserRole.school_director,
        UserRole.hr_evaluator,
        UserRole.hr_head,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this document")

    if not document.file_content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file not found")

    safe_filename = document.document_name.replace('"', "").replace("\\", "").replace("/", "")
    file_ext = document.document_type.lower() if document.document_type else "bin"
    if file_ext in ("pdf", "jpg", "jpeg", "png", "doc", "docx"):
        filename = f"{safe_filename}.{file_ext}"
    else:
        filename = safe_filename

    return StreamingResponse(
        iter([document.file_content]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/roles")
def list_roles() -> list[str]:
    return [role.value for role in UserRole]


@app.get("/admin-only")
def admin_only(current_user: User = Depends(require_roles(UserRole.admin))):
    return {"message": f"Welcome, {current_user.full_name}."}


@app.post("/api/leave-requests")
async def create_leave_request(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()
    leave_type = str(form.get("leave_type") or "").strip()
    start_date_raw = str(form.get("start_date") or "").strip()
    end_date_raw = str(form.get("end_date") or "").strip()
    reason = str(form.get("reason") or "").strip()
    file_name = str(form.get("file_name") or "").strip() or None

    if not leave_type or not start_date_raw or not end_date_raw or not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")

    start_date_val = parse_iso_date(start_date_raw)
    end_date_val = parse_iso_date(end_date_raw)
    if end_date_val < start_date_val:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be before start date")

    num_days = (end_date_val - start_date_val).days + 1

    leave_request = LeaveRequest(
        requester_user_id=int(current_user.id),
        requester_name=str(current_user.full_name),
        requester_role=str(current_user.role.value),
        leave_type=leave_type,
        start_date=start_date_val,
        end_date=end_date_val,
        num_days=num_days,
        status=LeaveStatus.pending,
        reason=reason,
        file_name=file_name,
        reviewed_by_user_id=None,
        reviewed_by_name=None,
        review_remarks="Awaiting review.",
    )
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    return {"message": "Leave request submitted successfully.", "leave": leave_to_payload(leave_request)}


@app.get("/api/leave-requests")
def list_leave_requests(
    mode: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role
    query = db.query(LeaveRequest)

    if role == UserRole.employee:
        query = query.filter(LeaveRequest.requester_user_id == int(current_user.id))
    elif role == UserRole.department_head:
        query = query.filter(
            (LeaveRequest.requester_user_id == int(current_user.id))
            | (LeaveRequest.requester_role == UserRole.employee.value)
        )
    elif role in {UserRole.hr_evaluator, UserRole.hr_head}:
        query = query.filter(LeaveRequest.requester_role != UserRole.admin.value)
    elif role == UserRole.school_director:
        query = query.filter(LeaveRequest.requester_role != UserRole.admin.value)
    else:
        query = query.filter(LeaveRequest.requester_user_id == int(current_user.id))

    if mode.lower() == "active":
        query = query.filter(LeaveRequest.status == LeaveStatus.pending)
    elif mode.lower() == "history":
        query = query.filter(LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.rejected]))

    items = query.order_by(LeaveRequest.created_at.desc()).all()
    return {"items": [leave_to_payload(item) for item in items]}


@app.get("/api/leave-credits")
def read_leave_credits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_sick_leave_credits(db, int(current_user.id))


@app.get("/api/leave-requests/{leave_id}")
def get_leave_request(
    leave_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    role = current_user.role
    if role == UserRole.employee and item.requester_user_id != int(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    return leave_to_payload(item)


@app.post("/api/leave-requests/{leave_id}/decision")
async def decide_leave_request(
    leave_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")

    if not can_review_leave(current_user, item):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to review this request")

    form = await request.form()
    decision_raw = str(form.get("decision") or "").strip().lower()
    remarks = str(form.get("remarks") or "").strip()

    if decision_raw not in {"approved", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    item.status = LeaveStatus.approved if decision_raw == "approved" else LeaveStatus.rejected
    item.reviewed_by_user_id = int(current_user.id)
    item.reviewed_by_name = str(current_user.full_name)
    item.review_remarks = remarks or f"{item.status.value} by {current_user.full_name} on {date.today().isoformat()}."
    db.commit()
    db.refresh(item)
    return {"message": f"Request {item.status.value.lower()}.", "leave": leave_to_payload(item)}


@app.get("/accounts/get-user-data/{user_id}/")
def get_user_data(user_id: int, current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    first_name, last_name = split_name(str(user.full_name))
    role_value = str(user.role.value)
    role_for_ui = "head" if role_value == "department_head" else ("hr" if role_value in {"hr_head", "hr_evaluator"} else role_value)

    department_id = None
    if user.role == UserRole.department_head:
        head_department = db.query(Department).filter(Department.head_user_id == int(user.id), Department.is_active == True).first()
        department_id = int(head_department.id) if head_department else None
    else:
        latest = (
            db.query(PositionChangeRequest)
            .filter(PositionChangeRequest.requester_user_id == int(user.id))
            .order_by(PositionChangeRequest.created_at.desc(), PositionChangeRequest.id.desc())
            .first()
        )
        if latest and latest.current_department:
            dept = db.query(Department).filter(Department.name == str(latest.current_department), Department.is_active == True).first()
            department_id = int(dept.id) if dept else None

    return {
        "id": user.id,
        "first_name": first_name,
        "last_name": last_name,
        "email": str(user.email),
        "username": str(user.username),
        "role": role_for_ui,
        "department_id": department_id,
    }


@app.post("/accounts/create-user/")
async def create_user(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    first_name = str(form.get("first_name") or form.get("firstName") or "").strip()
    last_name = str(form.get("last_name") or form.get("lastName") or "").strip()
    email = str(form.get("email") or "").strip().lower()
    username = str(form.get("username") or email.split("@")[0] or "").strip()
    role = normalize_role(str(form.get("role") or ""))
    department_id_raw = str(form.get("department") or form.get("departmentUserModal") or "").strip()
    password = str(form.get("password") or form.get("password1") or "").strip()
    password2 = str(form.get("confirm_password") or form.get("confirmPassword") or form.get("password2") or "").strip()

    if not first_name or not last_name or not email or not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")
    if not password or password != password2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")
    if not department_id_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department is required for this role")

    exists = db.query(User).filter((User.email == email) | (User.username == username)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or username already exists")

    user = User(
        full_name=f"{first_name} {last_name}".strip(),
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.flush()

    department: Department | None = None
    if department_id_raw:
        try:
            department_id = int(department_id_raw)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department") from exc

        department = db.query(Department).filter(Department.id == department_id, Department.is_active == True).first()
        if not department:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if role == UserRole.department_head and department:
        previous_department = db.query(Department).filter(Department.head_user_id == int(user.id)).first()
        if previous_department and int(previous_department.id) != int(department.id):
            previous_department.head_user_id = None
        department.head_user_id = user.id

    else:
        previous_department = db.query(Department).filter(Department.head_user_id == int(user.id)).first()
        if previous_department:
            previous_department.head_user_id = None

    if department:
        set_user_department(db, user, str(department.name))

    create_audit_log(
        db,
        activity_type="user_created",
        activity_label="User Created",
        status_type="success",
        description=f"Created user {user.full_name} with role {user.role.value}.",
        user=user,
        actor=current_user,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    db.commit()
    db.refresh(user)
    return {"message": "User created successfully.", "id": user.id}


@app.post("/accounts/edit-user/{user_id}/")
async def edit_user(user_id: int, current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    first_name = str(form.get("first_name") or form.get("firstName") or "").strip()
    last_name = str(form.get("last_name") or form.get("lastName") or "").strip()
    email = str(form.get("email") or user.email).strip().lower()
    username = str(form.get("username") or user.username).strip()
    role = normalize_role(str(form.get("role") or user.role.value))
    department_id_raw = str(form.get("department") or form.get("departmentUserModal") or "").strip()
    password = str(form.get("password") or form.get("password1") or "").strip()
    password2 = str(form.get("confirm_password") or form.get("confirmPassword") or form.get("password2") or "").strip()

    if not department_id_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department is required for this role")

    previous_role = str(user.role.value)
    previous_active = bool(user.is_active)

    if first_name and last_name:
        user.full_name = f"{first_name} {last_name}".strip()
    user.email = email
    user.username = username
    user.role = role

    if password or password2:
        if password != password2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")
        user.hashed_password = hash_password(password)
        user.must_change_password = True

    department: Department | None = None
    if department_id_raw:
        try:
            department_id = int(department_id_raw)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department") from exc

        department = db.query(Department).filter(Department.id == department_id, Department.is_active == True).first()
        if not department:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if role == UserRole.department_head and department:
        previous_department = db.query(Department).filter(Department.head_user_id == int(user.id)).first()
        if previous_department and int(previous_department.id) != int(department.id):
            previous_department.head_user_id = None
        department.head_user_id = user.id

    else:
        previous_department = db.query(Department).filter(Department.head_user_id == int(user.id)).first()
        if previous_department:
            previous_department.head_user_id = None

    if department:
        set_user_department(db, user, str(department.name))

    create_audit_log(
        db,
        activity_type="user_edited",
        activity_label="User Edited",
        status_type="success",
        description=f"Updated user {user.full_name}. Previous role: {previous_role}; new role: {user.role.value}. Active: {previous_active} -> {bool(user.is_active)}.",
        user=user,
        actor=current_user,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    db.commit()
    return {"message": "User updated successfully."}


@app.post("/accounts/assign-role/")
async def assign_role(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    user_id = int(str(form.get("user_id") or form.get("assignRoleUserId") or 0) or 0)
    role = normalize_role(str(form.get("role") or form.get("newRole") or ""))
    department_id_raw = str(form.get("department") or form.get("newDepartment") or "").strip()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    previous_role = str(user.role.value)
    user.role = role
    if role == UserRole.department_head and department_id_raw:
        try:
            department_id = int(department_id_raw)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department") from exc
        department = db.query(Department).filter(Department.id == department_id, Department.is_active == True).first()
        if not department:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        department.head_user_id = user.id

    create_audit_log(
        db,
        activity_type="role_changed",
        activity_label="Role Changed",
        status_type="success",
        description=f"Changed role for {user.full_name} from {previous_role} to {user.role.value}.",
        user=user,
        actor=current_user,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    db.commit()
    return {"message": "Role assigned successfully."}


@app.post("/accounts/reset-password/")
async def reset_password(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    user_id = int(str(form.get("user_id") or form.get("resetUserId") or form.get("reset_user_id") or 0) or 0)
    password = str(form.get("new_password1") or form.get("newPassword") or "").strip()
    password2 = str(form.get("new_password2") or form.get("confirmNewPassword") or "").strip()

    if not password or password != password2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(password)
    user.must_change_password = True

    create_audit_log(
        db,
        activity_type="password_changed",
        activity_label="Password Changed",
        status_type="warning",
        description=f"Password reset for {user.full_name}.",
        user=user,
        actor=current_user,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    db.commit()
    return {"message": "Password reset successfully."}


@app.post("/accounts/update-account-status/")
async def update_account_status(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    action = str(form.get("action") or "").strip().lower()
    raw_user_ids = form.getlist("user_ids[]") or form.getlist("user_ids")
    user_ids = parse_user_ids(raw_user_ids)
    if not user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No users selected")

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    if action in {"deactivate", "lock"}:
        for user in users:
            user.is_active = False
            create_audit_log(
                db,
                activity_type="account_deactivated",
                activity_label="Account Deactivated",
                status_type="warning",
                description=f"Account deactivated for {user.full_name}.",
                user=user,
                actor=current_user,
                ip_address=request.client.host if request and request.client else None,
                user_agent=request.headers.get("user-agent") if request else None,
            )
    elif action in {"activate", "unlock"}:
        for user in users:
            user.is_active = True
            create_audit_log(
                db,
                activity_type="account_activated",
                activity_label="Account Activated",
                status_type="success",
                description=f"Account activated for {user.full_name}.",
                user=user,
                actor=current_user,
                ip_address=request.client.host if request and request.client else None,
                user_agent=request.headers.get("user-agent") if request else None,
            )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action")

    db.commit()
    return {"message": "Account status updated successfully."}


@app.post("/accounts/delete-user/")
async def delete_user(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    raw_user_ids = form.getlist("user_ids[]") or form.getlist("user_ids")
    user_ids = parse_user_ids(raw_user_ids)
    if not user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No users selected")

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    if not users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching users found")

    for user in users:
        create_audit_log(
            db,
            activity_type="user_deleted",
            activity_label="User Deleted",
            status_type="warning",
            description=f"Deleted user {user.full_name} ({user.username}).",
            user=user,
            actor=current_user,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
        db.delete(user)

    db.commit()
    return {"message": "User(s) deleted successfully."}


@app.get("/accounts/get-department-data/{dept_id}/")
def get_department_data(dept_id: int, current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    return {
        "id": department.id,
        "name": department.name,
        "email": department.email,
        "location": department.location,
        "budget": float(department.budget) if department.budget is not None else None,
        "head_id": department.head_user_id,
    }


@app.post("/accounts/create-department/")
async def create_department(current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    name = str(form.get("name") or "").strip()
    email = str(form.get("email") or "").strip() or None
    location = str(form.get("location") or "").strip() or None
    budget_raw = str(form.get("budget") or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department name is required")

    budget = None
    if budget_raw:
        try:
            budget = Decimal(budget_raw)
        except InvalidOperation as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid budget") from exc

    department = Department(name=name, email=email, location=location, budget=budget, is_active=True)
    db.add(department)
    db.commit()
    db.refresh(department)
    return {"message": "Department created successfully.", "id": department.id}


@app.post("/accounts/edit-department/{dept_id}/")
async def edit_department(dept_id: int, current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db), request: Request = None):
    form = await request.form()
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    name = str(form.get("name") or department.name).strip()
    email = str(form.get("email") or "").strip() or None
    location = str(form.get("location") or "").strip() or None
    budget_raw = str(form.get("budget") or "").strip()
    head_id_raw = str(form.get("head") or form.get("head_id") or "").strip()

    department.name = name
    department.email = email
    department.location = location
    if budget_raw:
        try:
            department.budget = Decimal(budget_raw)
        except InvalidOperation as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid budget") from exc

    if head_id_raw:
        try:
            head_id = int(head_id_raw)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid head id") from exc
        head_user = db.query(User).filter(User.id == head_id).first()
        if not head_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Head user not found")
        department.head_user_id = head_id
        head_user.role = UserRole.department_head

    db.commit()
    return {"message": "Department updated successfully."}


@app.post("/accounts/deactivate-department/{dept_id}/")
def deactivate_department(dept_id: int, current_user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    department.is_active = False
    db.commit()
    return {"message": "Department deactivated successfully."}


@app.get("/api/employees/search")
def search_employees(
    q: str = "",
    limit: int = 10,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    needle = q.strip()
    if not needle:
        return {"items": []}

    safe_limit = max(1, min(limit, 25))
    users = (
        db.query(User)
        .filter(User.role == UserRole.employee)
        .filter(User.full_name.ilike(f"%{needle}%"))
        .order_by(User.full_name.asc())
        .limit(safe_limit)
        .all()
    )

    items: list[dict[str, str]] = []
    for user in users:
        latest_position_request = (
            db.query(PositionChangeRequest)
            .filter(PositionChangeRequest.requester_user_id == int(user.id))
            .order_by(PositionChangeRequest.created_at.desc())
            .first()
        )
        items.append(
            {
                "id": str(user.id),
                "name": str(user.full_name),
                "employeeNo": str(user.employee_no or f"EMP-{user.id:03d}"),
                "currentPosition": str((latest_position_request.current_position if latest_position_request else None) or "Employee"),
                "currentDepartment": str((latest_position_request.current_department if latest_position_request else None) or "General"),
            }
        )

    return {"items": items}


@app.get("/api/employees")
def list_employee_directory(
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.role == UserRole.employee)
        .order_by(User.full_name.asc())
        .all()
    )

    return {"items": [build_employee_directory_payload(user, db) for user in users]}


@app.get("/api/employees/{employee_id}")
def get_employee_directory_item(
    employee_id: int,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == employee_id, User.role == UserRole.employee).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return build_employee_directory_payload(user, db)


@app.get("/api/employees")
def list_employees(
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.role == UserRole.employee).order_by(User.full_name.asc()).all()
    return {"items": [build_employee_detail_payload(user, db) for user in users]}


@app.get("/api/employees/{employee_id}")
def get_employee_detail(
    employee_id: int,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == employee_id, User.role == UserRole.employee).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return build_employee_detail_payload(user, db)


@app.get("/api/users")
def list_all_users_for_sd(
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.full_name.asc(), User.id.asc()).all()
    return {"items": [build_universal_user_payload(user, db) for user in users]}


@app.get("/api/users/{user_id}")
def get_universal_user_for_sd(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return build_universal_user_payload(user, db)


@app.post("/api/employees")
async def create_employee_record(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    form = await request.form()
    username = str(form.get("username") or "").strip()
    first_name = str(form.get("first_name") or form.get("firstName") or "").strip()
    last_name = str(form.get("last_name") or form.get("lastName") or "").strip()
    employee_no = str(form.get("employee_id") or form.get("employee_no") or "").strip()
    email = str(form.get("email") or "").strip().lower()

    if not username or not first_name or not last_name or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")

    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")

    if employee_no:
        existing_employee_no = db.query(User).filter(User.employee_no == employee_no).first()
        if existing_employee_no:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists")

    new_user = User(
        employee_no=employee_no or None,
        full_name=f"{first_name} {last_name}".strip(),
        username=username,
        email=email,
        hashed_password=hash_password("ChangeMe123!"),
        role=UserRole.employee,
        is_active=True,
        must_change_password=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return build_employee_detail_payload(new_user, db)


@app.put("/api/employees/{employee_id}")
async def update_employee_record(
    employee_id: int,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == employee_id, User.role == UserRole.employee).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    form = await request.form()
    username = str(form.get("username") or user.username).strip()
    first_name = str(form.get("first_name") or form.get("firstName") or split_name(str(user.full_name))[0]).strip()
    last_name = str(form.get("last_name") or form.get("lastName") or split_name(str(user.full_name))[1]).strip()
    employee_no = str(form.get("employee_id") or form.get("employee_no") or (user.employee_no or "")).strip()
    email = str(form.get("email") or user.email).strip().lower()

    existing = db.query(User).filter(((User.username == username) | (User.email == email)), User.id != employee_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")

    if employee_no:
        existing_employee_no = db.query(User).filter(User.employee_no == employee_no, User.id != employee_id).first()
        if existing_employee_no:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists")

    user.username = username
    user.full_name = f"{first_name} {last_name}".strip()
    user.email = email
    user.employee_no = employee_no or None
    db.commit()
    db.refresh(user)
    return build_employee_detail_payload(user, db)


@app.delete("/api/employees/{employee_id}")
def delete_employee_record(
    employee_id: int,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director, UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == employee_id, User.role == UserRole.employee).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    db.delete(user)
    db.commit()
    return {"message": "Employee deleted successfully."}


@app.post("/api/position-requests")
async def create_position_request(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()
    employee_name = str(form.get("employee_name") or "").strip() or str(current_user.full_name)
    employee_no = str(form.get("employee_no") or "").strip() or None
    current_position = str(form.get("current_position") or "").strip() or None
    current_department = str(form.get("current_department") or "").strip() or None
    requested_position = str(form.get("requested_position") or "").strip()
    effective_date_raw = str(form.get("effective_date") or "").strip()
    reason = str(form.get("reason") or "").strip()

    if not requested_position or not effective_date_raw or not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")

    effective_date = parse_iso_date(effective_date_raw)

    item = PositionChangeRequest(
        requester_user_id=int(current_user.id),
        employee_name=employee_name,
        employee_no=employee_no,
        current_position=current_position,
        current_department=current_department,
        requested_position=requested_position,
        effective_date=effective_date,
        reason=reason,
        status=PositionChangeStatus.pending,
        reviewed_by_user_id=None,
        reviewed_by_name=None,
        review_remarks="Awaiting review.",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": "Position change request submitted.", "request": position_change_to_payload(item)}


@app.get("/api/position-requests")
def list_position_requests(
    mode: str = "all",
    employee: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PositionChangeRequest)

    if current_user.role == UserRole.employee:
        query = query.filter(PositionChangeRequest.requester_user_id == int(current_user.id))

    if employee:
        query = query.filter(PositionChangeRequest.employee_name.ilike(employee))

    mode_key = mode.lower()
    if mode_key == "active":
        query = query.filter(PositionChangeRequest.status == PositionChangeStatus.pending)
    elif mode_key == "history":
        query = query.filter(PositionChangeRequest.status.in_([PositionChangeStatus.approved, PositionChangeStatus.rejected]))

    items = query.order_by(PositionChangeRequest.created_at.desc()).all()
    return {"items": [position_change_to_payload(item) for item in items]}


@app.get("/api/position-requests/{request_id}")
def get_position_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(PositionChangeRequest).filter(PositionChangeRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position request not found")

    if current_user.role == UserRole.employee and item.requester_user_id != int(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    return position_change_to_payload(item)


@app.post("/api/position-requests/{request_id}/decision")
async def decide_position_request(
    request_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(PositionChangeRequest).filter(PositionChangeRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position request not found")

    if not can_review_position_request(current_user, item):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to review this request")

    form = await request.form()
    decision_raw = str(form.get("decision") or "").strip().lower()
    remarks = str(form.get("remarks") or "").strip()

    if decision_raw not in {"approved", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    item.status = PositionChangeStatus.approved if decision_raw == "approved" else PositionChangeStatus.rejected
    item.reviewed_by_user_id = int(current_user.id)
    item.reviewed_by_name = str(current_user.full_name)
    item.review_remarks = remarks or f"{item.status.value} by {current_user.full_name} on {date.today().isoformat()}."
    db.commit()
    db.refresh(item)
    return {"message": f"Request {item.status.value.lower()}.", "request": position_change_to_payload(item)}


@app.get("/api/reports/kpi")
def reports_kpi(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    total_employees = db.query(User).filter(User.role == UserRole.employee, User.is_active == True).count()
    approved_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == LeaveStatus.approved).count()
    total_leaves = db.query(LeaveRequest).count()
    pending_position_changes = db.query(PositionChangeRequest).filter(PositionChangeRequest.status == PositionChangeStatus.pending).count()
    total_departments = db.query(Department).filter(Department.is_active == True).count()

    present_today = (
        db.query(AttendanceRecord.user_id)
        .filter(
            AttendanceRecord.record_date == today,
            AttendanceRecord.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
        )
        .distinct()
        .count()
    )
    attendance_rate = round((present_today / total_employees) * 100, 2) if total_employees else 0.0

    approved_position_changes = db.query(PositionChangeRequest).filter(PositionChangeRequest.status == PositionChangeStatus.approved).count()
    turnover_rate = round((approved_position_changes / total_employees) * 100, 2) if total_employees else 0.0

    completed_trainings = db.query(TrainingSession).filter(TrainingSession.status == TrainingStatus.completed).count()
    total_trainings = db.query(TrainingSession).count()
    avg_performance = round((completed_trainings / total_trainings) * 10, 1) if total_trainings else 0.0

    return {
        "totalEmployees": total_employees,
        "attendanceRate": attendance_rate,
        "turnoverRate": turnover_rate,
        "avgPerformance": avg_performance,
        "summary": {
            "approvedLeaves": approved_leaves,
            "totalLeaves": total_leaves,
            "pendingPositionChanges": pending_position_changes,
            "activeDepartments": total_departments,
        },
    }


def build_report_rows(report_type: str, school: str, db: Session) -> list[dict[str, str]]:
    users = db.query(User).all()
    rows: list[dict[str, str]] = []

    for user in users:
        rows.append(
            {
                "employee-id": str(user.employee_no or f"EMP-{user.id:04d}"),
                "name": str(user.full_name),
                "school": str(user.role.value).replace("_", " ").title(),
                "email": str(user.email),
                "phone": "N/A",
                "salary": "N/A",
                "attendance": "N/A",
                "days-used": "N/A",
                "rating": "N/A",
            }
        )

    if school and school != "all":
        needle = school.replace("-", " ").lower()
        rows = [row for row in rows if needle in row["school"].lower()]

    return rows[:100]


def build_latest_position_map(db: Session) -> dict[int, PositionChangeRequest]:
    requests = (
        db.query(PositionChangeRequest)
        .order_by(
            PositionChangeRequest.requester_user_id.asc(),
            PositionChangeRequest.created_at.desc(),
            PositionChangeRequest.id.desc(),
        )
        .all()
    )

    latest_by_user: dict[int, PositionChangeRequest] = {}
    for item in requests:
        requester_id = int(item.requester_user_id)
        if requester_id not in latest_by_user:
            latest_by_user[requester_id] = item
    return latest_by_user


def build_department_employee_counts(
    employees: list[User],
    latest_position_by_user: dict[int, PositionChangeRequest],
) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for employee in employees:
        latest = latest_position_by_user.get(int(employee.id))
        department_name = (latest.current_department if latest else None) or "Unassigned"
        counts[str(department_name)] += 1
    return counts


def set_user_department(db: Session, user: User, department_name: str) -> None:
    latest = (
        db.query(PositionChangeRequest)
        .filter(PositionChangeRequest.requester_user_id == int(user.id))
        .order_by(PositionChangeRequest.created_at.desc(), PositionChangeRequest.id.desc())
        .first()
    )

    role_label = str(user.role.value).replace("_", " ").title()
    if latest:
        latest.current_department = department_name
        if not latest.current_position:
            latest.current_position = role_label
        if not latest.requested_position:
            latest.requested_position = role_label
        if latest.status != PositionChangeStatus.approved:
            latest.status = PositionChangeStatus.approved
        if not latest.reviewed_by_name:
            latest.reviewed_by_name = "System"
        if not latest.review_remarks:
            latest.review_remarks = "Department updated by admin."
        return

    db.add(
        PositionChangeRequest(
            requester_user_id=int(user.id),
            employee_name=str(user.full_name),
            employee_no=str(user.employee_no or "") or None,
            current_position=role_label,
            current_department=department_name,
            requested_position=role_label,
            effective_date=date.today(),
            reason="Department assigned by admin.",
            status=PositionChangeStatus.approved,
            reviewed_by_user_id=None,
            reviewed_by_name="System",
            review_remarks="Department assigned by admin.",
        )
    )


def format_relative_time(value: datetime | None) -> str:
    if not value:
        return "Unknown"
    now = datetime.now()
    delta = now - value
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        mins = max(1, seconds // 60)
        return f"{mins} minute{'s' if mins != 1 else ''} ago"
    if seconds < 86400:
        hours = max(1, seconds // 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = max(1, seconds // 86400)
    return f"{days} day{'s' if days != 1 else ''} ago"


@app.get("/api/reports/charts")
def reports_chart_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    employees = db.query(User).filter(User.role == UserRole.employee, User.is_active == True).all()
    total_employees = len(employees)
    employee_ids = [int(item.id) for item in employees]

    attendance_labels: list[str] = []
    attendance_values: list[float] = []
    for day_offset in range(6, -1, -1):
        current_day = today - timedelta(days=day_offset)
        attendance_labels.append(current_day.strftime("%a"))

        if not employee_ids:
            attendance_values.append(0.0)
            continue

        active_count = (
            db.query(AttendanceRecord.user_id)
            .filter(
                AttendanceRecord.user_id.in_(employee_ids),
                AttendanceRecord.record_date == current_day,
                AttendanceRecord.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
            )
            .distinct()
            .count()
        )
        attendance_values.append(round((active_count / total_employees) * 100, 2) if total_employees else 0.0)

    on_leave_count = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
        )
        .count()
    )
    inactive_employee_count = db.query(User).filter(User.role == UserRole.employee, User.is_active == False).count()
    department_head_count = db.query(User).filter(User.role == UserRole.department_head, User.is_active == True).count()

    latest_position_by_user = build_latest_position_map(db)
    department_counts = build_department_employee_counts(employees, latest_position_by_user)
    active_departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()

    department_labels: list[str] = []
    department_values: list[int] = []
    for dept in active_departments:
        department_labels.append(str(dept.name))
        department_values.append(int(department_counts.get(str(dept.name), 0)))

    if not department_labels:
        department_labels = ["Unassigned"]
        department_values = [int(department_counts.get("Unassigned", 0))]

    return {
        "attendanceTrend": {
            "labels": attendance_labels,
            "data": attendance_values,
        },
        "statusBreakdown": {
            "labels": ["Active", "On Leave", "Inactive", "Department Heads"],
            "data": [
                max(total_employees - on_leave_count, 0),
                int(on_leave_count),
                int(inactive_employee_count),
                int(department_head_count),
            ],
        },
        "departmentDistribution": {
            "labels": department_labels,
            "data": department_values,
        },
    }


@app.get("/accounts/users")
def list_users_for_admin(current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director)), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    departments = db.query(Department).filter(Department.is_active == True).all()
    latest_position_by_user = build_latest_position_map(db)

    department_name_to_id = {str(dept.name).lower(): int(dept.id) for dept in departments}
    role_labels = {
        UserRole.admin: "Admin",
        UserRole.school_director: "School Director",
        UserRole.hr_evaluator: "HR Evaluator",
        UserRole.hr_head: "HR Head",
        UserRole.department_head: "Department Head",
        UserRole.employee: "Employee",
    }

    items = []
    for user in users:
        if user.role == UserRole.department_head:
            head_department = db.query(Department).filter(Department.head_user_id == int(user.id), Department.is_active == True).first()
            department_name = str(head_department.name) if head_department else "Unassigned"
        else:
            latest = latest_position_by_user.get(int(user.id))
            department_name = (latest.current_department if latest else None) or "Unassigned"
        department_id = department_name_to_id.get(str(department_name).lower())

        items.append(
            {
                "id": int(user.id),
                "employeeNo": str(user.employee_no or ""),
                "name": str(user.full_name),
                "email": str(user.email),
                "role": str(user.role.value),
                "roleLabel": role_labels.get(user.role, str(user.role.value).replace("_", " ").title()),
                "isActive": bool(user.is_active),
                "department": str(department_name),
                "departmentId": int(department_id) if department_id is not None else None,
                "createdAt": user.created_at.isoformat() if user.created_at else None,
            }
        )

    return {"items": items}


@app.get("/accounts/departments")
def list_departments_for_admin(current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director)), db: Session = Depends(get_db)):
    departments = db.query(Department).order_by(Department.name.asc()).all()
    employees = db.query(User).filter(User.role == UserRole.employee, User.is_active == True).all()
    latest_position_by_user = build_latest_position_map(db)
    department_counts = build_department_employee_counts(employees, latest_position_by_user)

    head_user_ids = [int(dept.head_user_id) for dept in departments if dept.head_user_id]
    head_lookup: dict[int, User] = {}
    if head_user_ids:
        heads = db.query(User).filter(User.id.in_(head_user_ids)).all()
        for user in heads:
            head_lookup[int(user.id)] = user

    items = []
    for dept in departments:
        head_user = head_lookup.get(int(dept.head_user_id)) if dept.head_user_id else None
        items.append(
            {
                "id": int(dept.id),
                "name": str(dept.name),
                "email": str(dept.email or ""),
                "location": str(dept.location or ""),
                "budget": float(dept.budget) if dept.budget is not None else None,
                "isActive": bool(dept.is_active),
                "createdAt": dept.created_at.isoformat() if dept.created_at else None,
                "headId": int(dept.head_user_id) if dept.head_user_id else None,
                "headName": str(head_user.full_name) if head_user else None,
                "employeeCount": int(department_counts.get(str(dept.name), 0)),
            }
        )

    return {"items": items}


@app.get("/accounts/department-head-candidates")
def list_department_head_candidates(current_user: User = Depends(require_roles(UserRole.admin, UserRole.school_director)), db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.is_active == True)
        .filter(User.role != UserRole.employee)
        .order_by(User.full_name.asc())
        .all()
    )
    return {
        "items": [
            {
                "id": int(user.id),
                "name": str(user.full_name),
                "email": str(user.email),
                "role": str(user.role.value),
            }
            for user in users
        ]
    }


@app.get("/api/dashboard/notifications")
def dashboard_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications: list[dict[str, object]] = []

    leave_query = db.query(LeaveRequest)
    position_query = db.query(PositionChangeRequest)
    training_query = db.query(TrainingSession)

    if current_user.role == UserRole.employee:
        leave_query = leave_query.filter(LeaveRequest.requester_user_id == int(current_user.id))
        position_query = position_query.filter(PositionChangeRequest.requester_user_id == int(current_user.id))
    elif current_user.role == UserRole.department_head:
        leave_query = leave_query.filter(
            (LeaveRequest.requester_user_id == int(current_user.id))
            | (LeaveRequest.requester_role == UserRole.employee.value)
        )

    recent_leaves = leave_query.order_by(LeaveRequest.updated_at.desc()).limit(3).all()
    for item in recent_leaves:
        status_value = str(item.status.value or "Pending")
        notif_type = "success" if status_value == "Approved" else ("warning" if status_value == "Rejected" else "info")
        notifications.append(
            {
                "type": notif_type,
                "message": f"Leave request {status_value.lower()} ({item.leave_type})",
                "time": format_relative_time(item.updated_at or item.created_at),
                "_sort": item.updated_at or item.created_at,
            }
        )

    recent_positions = position_query.order_by(PositionChangeRequest.updated_at.desc()).limit(2).all()
    for item in recent_positions:
        status_value = str(item.status.value or "Pending")
        notif_type = "success" if status_value == "Approved" else ("warning" if status_value == "Rejected" else "info")
        notifications.append(
            {
                "type": notif_type,
                "message": f"Position request {status_value.lower()} ({item.requested_position})",
                "time": format_relative_time(item.updated_at or item.created_at),
                "_sort": item.updated_at or item.created_at,
            }
        )

    if current_user.role in {UserRole.hr_evaluator, UserRole.hr_head, UserRole.school_director, UserRole.department_head, UserRole.admin}:
        recent_trainings = training_query.order_by(TrainingSession.updated_at.desc()).limit(1).all()
        for item in recent_trainings:
            notifications.append(
                {
                    "type": "info",
                    "message": f"Training session updated: {item.title}",
                    "time": format_relative_time(item.updated_at or item.created_at),
                    "_sort": item.updated_at or item.created_at,
                }
            )

    notifications.sort(key=lambda x: x.get("_sort") or datetime.min, reverse=True)
    for item in notifications:
        item.pop("_sort", None)
    return {"items": notifications[:6]}


@app.get("/api/reports/preview")
def reports_preview(
    reportType: str = "employee-list",
    school: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = build_report_rows(reportType, school, db)
    return {"items": rows, "reportType": reportType}


@app.get("/api/reports/export")
def reports_export(
    reportType: str = "employee-list",
    school: str = "all",
    fields: str = "employee-id,name,school,email,phone",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = build_report_rows(reportType, school, db)
    field_keys = [field.strip() for field in fields.split(",") if field.strip()]
    if not field_keys:
        field_keys = ["employee-id", "name", "school", "email", "phone"]

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow([field.replace("-", " ").title() for field in field_keys])
    for row in rows:
        writer.writerow([row.get(field, "") for field in field_keys])

    filename = f"{reportType.replace('-', '_')}_report.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/admin/dashboard")
def admin_dashboard_analytics(
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    role_labels = {
        UserRole.admin: "Admin",
        UserRole.hr_evaluator: "HR Evaluator",
        UserRole.hr_head: "HR Head",
        UserRole.department_head: "Department Head",
        UserRole.school_director: "School Director",
        UserRole.employee: "Employee",
    }

    role_counts: dict[UserRole, int] = {}
    for role in role_labels.keys():
        role_counts[role] = db.query(User).filter(User.role == role).count()

    labels = [label for role, label in role_labels.items() if role_counts.get(role, 0) > 0]
    values = [role_counts[role] for role in role_labels.keys() if role_counts.get(role, 0) > 0]

    if not labels:
        labels = ["Employee"]
        values = [0]

    activity_labels: list[str] = []
    activity_values: list[int] = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for day_offset in range(6, -1, -1):
        current_day = date.today() - timedelta(days=day_offset)
        activity_labels.append(f"{day_names[current_day.weekday()]} {current_day.day}")
        active_count = (
            db.query(AttendanceRecord.user_id)
            .filter(AttendanceRecord.record_date == current_day)
            .distinct()
            .count()
        )
        activity_values.append(int(active_count))

    return {
        "loginActivity": {
            "labels": activity_labels,
            "data": activity_values,
        },
        "roleDistribution": {
            "labels": labels,
            "data": values,
        },
    }


@app.get("/api/admin/recent-activity")
def admin_recent_activity(
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    items: list[dict[str, object]] = []

    recent_users = db.query(User).order_by(User.created_at.desc()).limit(3).all()
    for user in recent_users:
        items.append(
            {
                "icon": "user-plus",
                "action": f"User account created: {user.full_name}",
                "actor": "System",
                "time": format_relative_time(user.created_at),
                "_sort": user.created_at,
            }
        )

    recent_leaves = db.query(LeaveRequest).order_by(LeaveRequest.updated_at.desc()).limit(3).all()
    for leave in recent_leaves:
        updated_at = leave.updated_at or leave.created_at
        items.append(
            {
                "icon": "calendar-check",
                "action": f"Leave request {leave.status.value.lower()}: {leave.requester_name}",
                "actor": leave.reviewed_by_name or "System",
                "time": format_relative_time(updated_at),
                "_sort": updated_at,
            }
        )

    recent_positions = db.query(PositionChangeRequest).order_by(PositionChangeRequest.updated_at.desc()).limit(3).all()
    for request in recent_positions:
        updated_at = request.updated_at or request.created_at
        items.append(
            {
                "icon": "user-tie",
                "action": f"Position request {request.status.value.lower()}: {request.employee_name}",
                "actor": request.reviewed_by_name or "System",
                "time": format_relative_time(updated_at),
                "_sort": updated_at,
            }
        )

    items.sort(key=lambda x: x.get("_sort") or datetime.min, reverse=True)
    trimmed = items[:8]
    for item in trimmed:
        item.pop("_sort", None)
    return {"items": trimmed}


@app.get("/api/admin/audit-trails")
def admin_audit_trails(
    search: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    action_type: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    def parse_date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None

    from_date_obj = parse_date(from_date)
    to_date_obj = parse_date(to_date)
    search_term = (search or "").strip().lower()
    action_filter = (action_type or "").strip().lower()
    status_filter = (status or "").strip().lower()

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10
    page_size = min(page_size, 100)

    query = db.query(AuditLog)

    if status_filter in {"success", "warning", "failed"}:
        query = query.filter(AuditLog.status_type == status_filter)

    if from_date_obj:
        start_dt = datetime.combine(from_date_obj, datetime.min.time())
        query = query.filter(AuditLog.occurred_at >= start_dt)
    if to_date_obj:
        end_dt = datetime.combine(to_date_obj, datetime.max.time())
        query = query.filter(AuditLog.occurred_at <= end_dt)

    if search_term:
        pattern = f"%{search_term}%"
        query = query.filter(
            or_(
                AuditLog.username.ilike(pattern),
                AuditLog.email.ilike(pattern),
                AuditLog.ip_address.ilike(pattern),
                AuditLog.user_agent.ilike(pattern),
                AuditLog.description.ilike(pattern),
                AuditLog.actor_name.ilike(pattern),
            )
        )

    login_types = ["login", "logout", "failed_login"]
    login_query = query.filter(AuditLog.activity_type.in_(login_types))
    activity_query = query.filter(~AuditLog.activity_type.in_(login_types))

    if action_filter:
        if action_filter in login_types:
            login_query = login_query.filter(AuditLog.activity_type == action_filter)
            activity_query = activity_query.filter(and_(AuditLog.id == -1))
        else:
            login_query = login_query.filter(and_(AuditLog.id == -1))
            activity_query = activity_query.filter(AuditLog.activity_type == action_filter)

    total_login = login_query.count()
    total_activity = activity_query.count()
    max_total = max(total_login, total_activity)
    total_pages = max(1, (max_total + page_size - 1) // page_size)
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    login_rows = (
        login_query
        .order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    activity_rows = (
        activity_query
        .order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return {
        "loginLogs": [
            {
                "id": item.id,
                "username": item.username,
                "email": item.email,
                "loginTime": to_iso(item.login_time or item.occurred_at),
                "logoutTime": to_iso(item.logout_time),
                "recordDate": item.occurred_at.date().isoformat() if item.occurred_at else None,
                "ipAddress": item.ip_address or "N/A",
                "userAgent": item.user_agent or "N/A",
                "status": normalize_status_type(item.status_type).title(),
                "statusType": normalize_status_type(item.status_type),
                "notes": item.description or "",
            }
            for item in login_rows
        ],
        "activityLogs": [
            {
                "id": item.id,
                "activityType": item.activity_type,
                "activityLabel": item.activity_label,
                "actor": item.actor_name or "System",
                "user": item.username or "N/A",
                "email": item.email or "",
                "ipAddress": item.ip_address or "N/A",
                "description": item.description or "",
                "status": normalize_status_type(item.status_type).title(),
                "statusType": normalize_status_type(item.status_type),
                "timestamp": to_iso(item.occurred_at),
            }
            for item in activity_rows
        ],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages,
            "totalLogin": total_login,
            "totalActivity": total_activity,
        },
    }


@app.get("/api/trainings")
def list_trainings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(TrainingSession).order_by(TrainingSession.training_date.asc(), TrainingSession.id.asc()).all()
    payload = []
    for session in sessions:
        registration_count = db.query(TrainingRegistration).filter(TrainingRegistration.training_session_id == session.id).count()
        payload.append(training_session_to_payload(session, registration_count))
    return {"items": payload}


@app.get("/api/trainings/me")
def list_my_trainings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    registrations = (
        db.query(TrainingRegistration, TrainingSession)
        .join(TrainingSession, TrainingSession.id == TrainingRegistration.training_session_id)
        .filter(TrainingRegistration.user_id == int(current_user.id))
        .order_by(TrainingSession.training_date.asc())
        .all()
    )

    return {
        "items": [training_registration_to_payload(registration, training) for registration, training in registrations]
    }


@app.post("/api/trainings")
async def create_training_session(
    request: Request,
    current_user: User = Depends(require_roles(UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    form = await request.form()
    title = str(form.get("title") or "").strip()
    category = str(form.get("category") or "").strip()
    training_type = str(form.get("training_type") or form.get("mode") or "").strip()
    training_date_raw = str(form.get("training_date") or form.get("date") or "").strip()
    description = str(form.get("description") or "").strip() or None
    provider = str(form.get("provider") or "").strip() or None
    location = str(form.get("location") or "").strip() or None
    contact = str(form.get("contact") or "").strip() or None
    total_slots_raw = str(form.get("total_slots") or "").strip()
    remarks = str(form.get("remarks") or "").strip() or None

    if not title or not category or not training_type or not training_date_raw or not total_slots_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing required fields")

    try:
        training_date = datetime.strptime(training_date_raw, "%Y-%m-%d").date()
        total_slots = int(total_slots_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid training data") from exc

    existing = db.query(TrainingSession).filter(TrainingSession.title == title).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Training title already exists")

    session = TrainingSession(
        title=title,
        category=category,
        training_type=training_type,
        training_date=training_date,
        description=description,
        provider=provider,
        location=location,
        contact=contact,
        total_slots=total_slots,
        filled_slots=0,
        status=TrainingStatus.open,
        remarks=remarks,
        created_by_user_id=int(current_user.id),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"message": "Training session created successfully.", "training": training_session_to_payload(session, 0)}


@app.post("/api/trainings/{training_id}/register")
def register_for_training(
    training_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    if session.status in {TrainingStatus.completed, TrainingStatus.cancelled}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Training is not open for registration")

    existing = db.query(TrainingRegistration).filter(
        TrainingRegistration.training_session_id == session.id,
        TrainingRegistration.user_id == int(current_user.id),
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already registered")

    registration_count = db.query(TrainingRegistration).filter(TrainingRegistration.training_session_id == session.id).count()
    if session.total_slots and registration_count >= int(session.total_slots):
        session.status = TrainingStatus.full
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Training is full")

    registration = TrainingRegistration(
        training_session_id=session.id,
        user_id=int(current_user.id),
        status="Registered",
    )
    db.add(registration)
    session.filled_slots = registration_count + 1
    if session.total_slots and session.filled_slots >= int(session.total_slots):
        session.status = TrainingStatus.full
    db.commit()
    db.refresh(registration)
    db.refresh(session)
    return {"message": "Training registration saved.", "registration": training_registration_to_payload(registration, session)}


@app.post("/api/trainings/{training_id}/decision")
async def decide_training_session(
    training_id: int,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.hr_evaluator, UserRole.hr_head)),
    db: Session = Depends(get_db),
):
    session = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    form = await request.form()
    decision_raw = str(form.get("decision") or "").strip().lower()
    remarks = str(form.get("remarks") or "").strip()

    if decision_raw not in {"completed", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision")

    session.status = TrainingStatus.completed if decision_raw == "completed" else TrainingStatus.cancelled
    session.remarks = remarks or session.remarks
    db.commit()
    db.refresh(session)
    registration_count = db.query(TrainingRegistration).filter(TrainingRegistration.training_session_id == session.id).count()
    return {"message": f"Training {session.status.value.lower()}.", "training": training_session_to_payload(session, registration_count)}


@app.get("/api/attendance/history")
def get_attendance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == int(current_user.id))
        .order_by(AttendanceRecord.record_date.desc())
        .all()
    )
    return {"items": [attendance_to_payload(record) for record in records]}


@app.get("/api/attendance/today")
def get_today_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == int(current_user.id), AttendanceRecord.record_date == date.today())
        .first()
    )
    return attendance_summary_payload(record)


@app.post("/api/attendance/clock-in")
def clock_in(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == int(current_user.id), AttendanceRecord.record_date == today)
        .first()
    )
    if record and record.time_in and not record.time_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already clocked in")

    if not record:
        record = AttendanceRecord(
            user_id=int(current_user.id),
            record_date=today,
            time_in=datetime.now(),
            worked_seconds=0,
            status=AttendanceStatus.present,
        )
        db.add(record)
    else:
        record.time_in = datetime.now()
        record.time_out = None
        record.worked_seconds = 0
        record.status = AttendanceStatus.present

    db.commit()
    db.refresh(record)
    return {"message": "Clocked in successfully.", "attendance": attendance_summary_payload(record)}


@app.post("/api/attendance/clock-out")
def clock_out(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == int(current_user.id), AttendanceRecord.record_date == today)
        .first()
    )
    if not record or not record.time_in or record.time_out:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active clock-in found")

    now = datetime.now()
    record.time_out = now
    record.worked_seconds = max(0, int((now - record.time_in).total_seconds()))
    record.status = AttendanceStatus.present
    db.commit()
    db.refresh(record)
    return {"message": "Clocked out successfully.", "attendance": attendance_summary_payload(record)}


@app.get("/api/attendance/summary")
def attendance_summary(
    view: str = "weekly",
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == int(current_user.id))
        .order_by(AttendanceRecord.record_date.asc())
        .all()
    )

    if view.lower() == "monthly":
        return build_monthly_attendance_summary(records, max(0, offset))

    return build_weekly_attendance_summary(records, max(0, offset))


@app.get("/api/attendance/monitoring")
def attendance_monitoring(
    offset: int = 0,
    current_user: User = Depends(require_roles(UserRole.hr_evaluator, UserRole.hr_head, UserRole.department_head, UserRole.school_director, UserRole.admin)),
    db: Session = Depends(get_db),
):
    safe_offset = max(-52, min(52, offset))
    today = date.today()
    sunday_index = (today.weekday() + 1) % 7
    current_week_start = today - timedelta(days=sunday_index)
    week_start = current_week_start - timedelta(days=safe_offset * 7)
    week_end = week_start + timedelta(days=6)

    employees = (
        db.query(User)
        .filter(User.role == UserRole.employee, User.is_active == True)
        .order_by(User.full_name.asc())
        .all()
    )
    employee_ids = [int(user.id) for user in employees]

    records = []
    if employee_ids:
        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.user_id.in_(employee_ids),
                AttendanceRecord.record_date >= week_start,
                AttendanceRecord.record_date <= week_end,
            )
            .all()
        )

    attendance_lookup: dict[tuple[int, date], AttendanceRecord] = {}
    for record in records:
        attendance_lookup[(int(record.user_id), record.record_date)] = record

    def get_status_payload(record: AttendanceRecord | None, current_day: date) -> dict[str, str]:
        if not record:
            return {"status": "none", "label": "", "pillClass": ""}

        if record.time_in and not record.time_out and current_day == today:
            return {"status": "active", "label": "Active", "pillClass": "pill-green"}

        status_value = record.status.value.lower()
        if status_value in {"present", "late"}:
            worked_seconds = int(record.worked_seconds or 0)
            hours = worked_seconds // 3600
            minutes = (worked_seconds % 3600) // 60
            if worked_seconds > 0:
                return {
                    "status": status_value,
                    "label": f"{hours}h {minutes:02d}m",
                    "pillClass": "pill-tan" if status_value == "late" else "pill-green",
                }
            return {
                "status": status_value,
                "label": "Present",
                "pillClass": "pill-green",
            }

        if status_value == "absent":
            return {"status": "absent", "label": "Absent", "pillClass": "pill-red"}
        if status_value == "leave":
            return {"status": "leave", "label": "Leave", "pillClass": "pill-purple"}
        if status_value == "holiday":
            return {"status": "holiday", "label": "Holiday", "pillClass": "pill-purple"}

        return {"status": status_value, "label": status_value.title(), "pillClass": "pill-green"}

    rows: list[dict[str, object]] = []
    for user in employees:
        latest_position = (
            db.query(PositionChangeRequest)
            .filter(PositionChangeRequest.requester_user_id == int(user.id))
            .order_by(PositionChangeRequest.created_at.desc())
            .first()
        )

        title = (latest_position.current_position if latest_position and latest_position.current_position else "Employee")
        department = (latest_position.current_department if latest_position and latest_position.current_department else "General")
        employee_no = str(user.employee_no or f"EMP-{int(user.id):03d}")

        days: list[dict[str, object]] = []
        for day_index in range(7):
            current_day = week_start + timedelta(days=day_index)
            record = attendance_lookup.get((int(user.id), current_day))
            status_payload = get_status_payload(record, current_day)
            days.append(
                {
                    "date": current_day.isoformat(),
                    "dayNum": int(current_day.day),
                    "status": status_payload["status"],
                    "label": status_payload["label"],
                    "pillClass": status_payload["pillClass"],
                }
            )

        rows.append(
            {
                "userId": int(user.id),
                "employeeId": employee_no,
                "name": str(user.full_name),
                "title": str(title),
                "department": str(department),
                "days": days,
            }
        )

    return {
        "weekOffset": safe_offset,
        "weekStart": week_start.isoformat(),
        "weekEnd": week_end.isoformat(),
        "weekLabel": f"{week_start.strftime('%b')} {week_start.day} - {week_end.strftime('%b')} {week_end.day}, {week_end.year}",
        "rows": rows,
    }