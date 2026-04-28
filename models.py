from enum import Enum

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, func

from database import Base


def enum_values(enum_cls: type[Enum]) -> list[str]:
    return [str(item.value) for item in enum_cls]


class UserRole(str, Enum):
    admin = "admin"
    school_director = "school_director"
    hr_evaluator = "hr_evaluator"
    hr_head = "hr_head"
    department_head = "department_head"
    employee = "employee"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_no = Column(String(50), unique=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    must_change_password = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    contact_number = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    emergency_name = Column(String(150), nullable=True)
    emergency_phone = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    email = Column(String(255), nullable=True)
    location = Column(String(200), nullable=True)
    budget = Column(Numeric(12, 2), nullable=True)
    head_user_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class LeaveStatus(str, Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_user_id = Column(Integer, nullable=False, index=True)
    requester_name = Column(String(150), nullable=False)
    requester_role = Column(String(80), nullable=False)
    leave_type = Column(String(80), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    num_days = Column(Integer, nullable=False)
    status = Column(
        SAEnum(LeaveStatus, name="leave_status", values_callable=enum_values),
        nullable=False,
        default=LeaveStatus.pending,
    )
    reason = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=True)
    reviewed_by_user_id = Column(Integer, nullable=True)
    reviewed_by_name = Column(String(150), nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class PositionChangeStatus(str, Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class PositionChangeRequest(Base):
    __tablename__ = "position_change_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_user_id = Column(Integer, nullable=False, index=True)
    employee_name = Column(String(150), nullable=False)
    employee_no = Column(String(50), nullable=True)
    current_position = Column(String(120), nullable=True)
    current_department = Column(String(120), nullable=True)
    requested_position = Column(String(120), nullable=False)
    effective_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(
        SAEnum(PositionChangeStatus, name="position_change_status", values_callable=enum_values),
        nullable=False,
        default=PositionChangeStatus.pending,
    )
    reviewed_by_user_id = Column(Integer, nullable=True)
    reviewed_by_name = Column(String(150), nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class TrainingStatus(str, Enum):
    open = "Open"
    full = "Full"
    completed = "Completed"
    cancelled = "Cancelled"


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, unique=True)
    category = Column(String(100), nullable=False)
    training_type = Column(String(50), nullable=False)
    training_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    provider = Column(String(200), nullable=True)
    location = Column(String(255), nullable=True)
    contact = Column(String(255), nullable=True)
    total_slots = Column(Integer, nullable=False, default=0)
    filled_slots = Column(Integer, nullable=False, default=0)
    status = Column(
        SAEnum(TrainingStatus, name="training_status", values_callable=enum_values),
        nullable=False,
        default=TrainingStatus.open,
    )
    remarks = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class TrainingRegistration(Base):
    __tablename__ = "training_registrations"

    id = Column(Integer, primary_key=True, index=True)
    training_session_id = Column(Integer, ForeignKey("training_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="Registered")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class AttendanceStatus(str, Enum):
    present = "Present"
    late = "Late"
    leave = "Leave"
    holiday = "Holiday"
    absent = "Absent"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    record_date = Column(Date, nullable=False, index=True)
    time_in = Column(DateTime, nullable=True)
    time_out = Column(DateTime, nullable=True)
    worked_seconds = Column(Integer, nullable=False, default=0)
    status = Column(
        SAEnum(AttendanceStatus, name="attendance_status", values_callable=enum_values),
        nullable=False,
        default=AttendanceStatus.present,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String(80), nullable=True)
    email = Column(String(255), nullable=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_name = Column(String(150), nullable=True)
    activity_type = Column(String(64), nullable=False, index=True)
    activity_label = Column(String(120), nullable=False)
    status_type = Column(String(20), nullable=False, default="success", index=True)
    description = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    login_time = Column(DateTime, nullable=True)
    logout_time = Column(DateTime, nullable=True)
    occurred_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class ProfileDocument(Base):
    __tablename__ = "profile_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)
    status = Column(String(40), nullable=False, default="Submitted")
    file_url = Column(String(500), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reviewed_by_name = Column(String(150), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class EmploymentHistory(Base):
    __tablename__ = "employment_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_date = Column(Date, nullable=False, index=True)
    event_title = Column(String(120), nullable=False)
    event_description = Column(Text, nullable=True)
    source = Column(String(60), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())