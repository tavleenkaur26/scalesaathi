"""All tables. Only P2 changes this file (shared Neon DB): see the team rules."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (JSON, Boolean, DateTime, Float, ForeignKey, Integer, LargeBinary,
                        String, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db import Base


def utcnow() -> datetime:
    # second precision keeps the approval timestamp identical after a DB round-trip (hashing)
    return datetime.now(timezone.utc).replace(microsecond=0)


def _dt():
    return DateTime(timezone=True)


class Lab(Base):
    __tablename__ = "labs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[Optional[str]] = mapped_column(Text)
    accreditation_no: Mapped[Optional[str]] = mapped_column(String(100))
    logo: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    logo_content_type: Mapped[Optional[str]] = mapped_column(String(50))
    default_conditions_text: Mapped[Optional[str]] = mapped_column(Text)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))
    designation: Mapped[Optional[str]] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))
    lab_id: Mapped[Optional[int]] = mapped_column(ForeignKey("labs.id"))
    signature: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    signature_content_type: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    lab: Mapped[Optional[Lab]] = relationship()


class Manufacturer(Base):
    __tablename__ = "manufacturers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    address: Mapped[Optional[str]] = mapped_column(Text)
    contact_person: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)


class Instrument(Base):
    """Spec columns mirror engine.InstrumentSpec. All masses in grams."""
    __tablename__ = "instruments"
    __table_args__ = (UniqueConstraint("manufacturer_id", "model", "serial_no"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id"))
    model: Mapped[str] = mapped_column(String(100), index=True)
    serial_no: Mapped[str] = mapped_column(String(100))
    instrument_type: Mapped[Optional[str]] = mapped_column(String(100))
    max_capacity: Mapped[float] = mapped_column(Float)
    min_capacity: Mapped[float] = mapped_column(Float)
    e: Mapped[float] = mapped_column(Float)
    d: Mapped[Optional[float]] = mapped_column(Float)
    accuracy_class: Mapped[str] = mapped_column(String(5))
    max_tare: Mapped[float] = mapped_column(Float, default=0)
    support_points: Mapped[int] = mapped_column(Integer, default=4)
    temp_min: Mapped[Optional[float]] = mapped_column(Float)
    temp_max: Mapped[Optional[float]] = mapped_column(Float)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)
    manufacturer: Mapped[Manufacturer] = relationship()


class TestSession(Base):
    __tablename__ = "test_sessions"
    __test__ = False  # not a pytest class
    id: Mapped[int] = mapped_column(primary_key=True)
    seed_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    instrument_id: Mapped[int] = mapped_column(ForeignKey("instruments.id"), index=True)
    tester_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="Draft", index=True)
    location: Mapped[Optional[str]] = mapped_column(String(200))
    tested_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)
    temperature_c: Mapped[Optional[float]] = mapped_column(Float)
    humidity_pct: Mapped[Optional[float]] = mapped_column(Float)
    pressure_hpa: Mapped[Optional[float]] = mapped_column(Float)
    ruleset_version: Mapped[Optional[str]] = mapped_column(String(50))
    verdict_overall: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    verdict_json: Mapped[Optional[dict]] = mapped_column(JSON)
    marginal_results: Mapped[int] = mapped_column(Integer, default=0)
    rounding_traps: Mapped[int] = mapped_column(Integer, default=0)
    reviewer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    review_comment: Mapped[Optional[str]] = mapped_column(Text)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(_dt())
    created_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow, onupdate=utcnow)
    instrument: Mapped[Instrument] = relationship()
    tester: Mapped[User] = relationship(foreign_keys=[tester_id])
    reviewer: Mapped[Optional[User]] = relationship(foreign_keys=[reviewer_id])
    observations: Mapped[list["Observation"]] = relationship(
        cascade="all, delete-orphan", back_populates="session")
    results: Mapped[list["Result"]] = relationship(
        cascade="all, delete-orphan", back_populates="session", order_by="Result.id")


class Observation(Base):
    """One row per (session, test). payload has the shape of that SessionInput field."""
    __tablename__ = "observations"
    __table_args__ = (UniqueConstraint("session_id", "test"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"), index=True)
    test: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow, onupdate=utcnow)
    session: Mapped[TestSession] = relationship(back_populates="observations")


class Result(Base):
    """One row per engine TestResult; `data` keeps the full engine JSON."""
    __tablename__ = "results"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"), index=True)
    test: Mapped[str] = mapped_column(String(40), index=True)
    label: Mapped[Optional[str]] = mapped_column(String(200))
    load: Mapped[Optional[float]] = mapped_column(Float)
    error: Mapped[Optional[float]] = mapped_column(Float)
    naive_error: Mapped[Optional[float]] = mapped_column(Float)
    mpe: Mapped[Optional[float]] = mapped_column(Float)
    result: Mapped[str] = mapped_column(String(20), index=True)
    naive_result: Mapped[Optional[str]] = mapped_column(String(20))
    marginal: Mapped[bool] = mapped_column(Boolean, default=False)
    method: Mapped[Optional[str]] = mapped_column(String(20))
    clause: Mapped[Optional[str]] = mapped_column(Text)
    data: Mapped[dict] = mapped_column(JSON)
    session: Mapped[TestSession] = relationship(back_populates="results")


class Report(Base):
    """One row per approved session (created at approval)."""
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"), unique=True)
    report_no: Mapped[Optional[str]] = mapped_column(String(30), unique=True)
    hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    ruleset_version: Mapped[Optional[str]] = mapped_column(String(50))
    overall_verdict: Mapped[str] = mapped_column(String(20))
    approved_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime] = mapped_column(_dt())
    created_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)
    session: Mapped[TestSession] = relationship()
    approved_by: Mapped[User] = relationship()


class Attachment(Base):
    __tablename__ = "attachments"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("test_sessions.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    filename: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    caption: Mapped[Optional[str]] = mapped_column(String(500))
    include_in_report: Mapped[bool] = mapped_column(Boolean, default=True)
    uploaded_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)


class AuditLog(Base):
    """Append-only. `description` is set only for explicit business events (dashboard feed)."""
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[datetime] = mapped_column(_dt(), default=utcnow, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer)
    user_name: Mapped[Optional[str]] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(50))
    entity: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(Text)
    detail: Mapped[Optional[dict]] = mapped_column(JSON)


class RulesetVersion(Base):
    __tablename__ = "ruleset_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(50), unique=True)
    ruleset_id: Mapped[str] = mapped_column(String(100))
    data: Mapped[dict] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(_dt(), default=utcnow)
