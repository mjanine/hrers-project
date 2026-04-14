import os

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import authenticate_user, create_access_token, get_current_user, require_roles
from database import Base, engine, get_db
from models import User, UserRole


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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
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
    return response


@app.get("/auth/logout")
def logout() -> RedirectResponse:
    response = RedirectResponse(url="/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.delete_cookie("access_token")
    return response


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/roles")
def list_roles() -> list[str]:
    return [role.value for role in UserRole]


@app.get("/admin-only")
def admin_only(current_user: User = Depends(require_roles(UserRole.admin))):
    return {"message": f"Welcome, {current_user.full_name}."}