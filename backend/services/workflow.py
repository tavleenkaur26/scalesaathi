"""Maker-checker state machine: Draft -> Submitted -> Under Review -> Approved / Returned."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.constants import (ADMIN, APPROVED, EDITABLE, IN_REVIEW, RETURNED, REVIEWER, SUBMITTED,
                               TESTER, UNDER_REVIEW)
from backend.models import Report, TestSession, User, utcnow
from backend.services import reporting
from backend.services.audit import log_event


def _label(s: TestSession) -> str:
    return f"{s.instrument.manufacturer.name} {s.instrument.model} (session #{s.id})"


def submit(db: Session, user: User, s: TestSession) -> None:
    if user.role not in (TESTER, ADMIN) or (user.role == TESTER and s.tester_id != user.id):
        raise HTTPException(403, "Only the session's tester (or an Admin) can submit it")
    if s.status not in EDITABLE:
        raise HTTPException(409, f"Cannot submit a session that is {s.status}")
    if s.verdict_overall in (None, "INCOMPLETE"):
        raise HTTPException(409, "Evaluate the session first; the verdict must not be INCOMPLETE")
    s.status, s.submitted_at, s.review_comment = SUBMITTED, utcnow(), None
    log_event(db, user, "submit", "session", s.id, f"{user.full_name} submitted {_label(s)} for review")


def start_review(db: Session, user: User, s: TestSession) -> None:
    if s.status != SUBMITTED:
        raise HTTPException(409, f"Only Submitted sessions can be picked up (this one is {s.status})")
    if s.tester_id == user.id:
        raise HTTPException(403, "You cannot review your own session")
    s.status, s.reviewer_id = UNDER_REVIEW, user.id
    log_event(db, user, "start_review", "session", s.id, f"{user.full_name} started reviewing {_label(s)}")


def approve(db: Session, user: User, s: TestSession, approved_at: Optional[datetime] = None) -> Report:
    if s.status not in IN_REVIEW:
        raise HTTPException(409, f"Only Submitted / Under Review sessions can be approved (this one is {s.status})")
    if s.tester_id == user.id:
        raise HTTPException(403, "Maker-checker: a tester cannot approve their own session")
    approved_at = (approved_at or utcnow()).replace(microsecond=0)
    s.status, s.reviewer_id, s.review_comment = APPROVED, user.id, None
    rep = Report(session_id=s.id, ruleset_version=s.ruleset_version, overall_verdict=s.verdict_overall,
                 approved_by_id=user.id, approved_at=approved_at, created_at=approved_at,
                 hash=reporting.compute_hash(s, user.id, approved_at))
    db.add(rep)
    db.flush()
    rep.report_no = f"SS-{approved_at.year}-{rep.id:04d}"
    log_event(db, user, "approve", "session", s.id, f"{user.full_name} approved {_label(s)} ({s.verdict_overall})")
    return rep


def return_to_tester(db: Session, user: User, s: TestSession, comment: str) -> None:
    if not comment or not comment.strip():
        raise HTTPException(422, "A comment is required when returning a session")
    if s.status not in IN_REVIEW:
        raise HTTPException(409, f"Only Submitted / Under Review sessions can be returned (this one is {s.status})")
    if s.tester_id == user.id:
        raise HTTPException(403, "You cannot review your own session")
    s.status, s.reviewer_id, s.review_comment = RETURNED, user.id, comment.strip()
    log_event(db, user, "return", "session", s.id, f"{user.full_name} returned {_label(s)}: {comment.strip()[:80]}")
