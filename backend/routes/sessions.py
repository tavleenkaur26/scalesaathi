from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.config import settings
from backend.constants import (ADMIN, ALLOWED_UPLOADS, ATTACHMENT_KINDS, DRAFT, REVIEWER, TESTER)
from backend.db import get_db
from backend.models import Attachment, Instrument, Report, TestSession, User, utcnow
from backend.services import engine_adapter as ea, sessions as svc, workflow
from backend.services.sessions import iso

router = APIRouter(tags=["sessions"])


class Conditions(BaseModel):
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    pressure_hpa: Optional[float] = None


class SessionIn(BaseModel):
    instrument_id: int
    location: Optional[str] = None
    tested_at: Optional[datetime] = None
    conditions: Conditions = Conditions()


class ObservationIn(BaseModel):
    test: str
    payload: Any


class CommentIn(BaseModel):
    comment: Optional[str] = None


def _detail(db: Session, s: TestSession) -> dict:
    out = svc.session_detail(s)
    rep = db.query(Report).filter_by(session_id=s.id).first()
    out["report_no"] = rep.report_no if rep else None
    out["attachments"] = [
        {"id": a.id, "kind": a.kind, "filename": a.filename, "caption": a.caption,
         "content_type": a.content_type, "size_bytes": a.size_bytes, "uploaded_at": iso(a.uploaded_at)}
        for a in db.query(Attachment).filter_by(session_id=s.id).order_by(Attachment.id).all()]
    return out


@router.post("/sessions", status_code=201)
def create_session(body: SessionIn, db: Session = Depends(get_db),
                   user: User = Depends(require_role(TESTER, ADMIN))):
    if db.get(Instrument, body.instrument_id) is None:
        raise HTTPException(404, "Instrument not found")
    c = body.conditions
    s = TestSession(instrument_id=body.instrument_id, tester_id=user.id, status=DRAFT,
                    location=body.location, tested_at=body.tested_at or utcnow(),
                    temperature_c=c.temperature_c, humidity_pct=c.humidity_pct, pressure_hpa=c.pressure_hpa,
                    ruleset_version=ea.get_ruleset(db).version)
    db.add(s)
    db.commit()
    return _detail(db, s)


@router.get("/sessions")
def list_sessions(status: Optional[str] = None, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    q = db.query(TestSession)
    if user.role == TESTER:
        q = q.filter(TestSession.tester_id == user.id)
    elif user.role == REVIEWER:
        q = q.filter(TestSession.status != DRAFT)
    if status:
        q = q.filter(TestSession.status == status)
    return [svc.session_summary(s) for s in q.order_by(TestSession.id.desc()).all()]


@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = svc.get_session_or_404(db, session_id)
    svc.assert_can_view(user, s)
    return _detail(db, s)


@router.post("/sessions/{session_id}/observations")
def save_observations(session_id: int, body: ObservationIn, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    """Save or replace the readings of ONE test. Payload shape = that field of engine SessionInput."""
    s = svc.get_session_or_404(db, session_id)
    svc.assert_can_edit(user, s)
    svc.save_observation(db, s, body.test, body.payload)
    db.commit()
    return {"session_id": s.id, "test": body.test, "saved": True, "tests_recorded": sorted(svc.observations_of(s))}


@router.post("/sessions/{session_id}/evaluate")
def evaluate(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = svc.get_session_or_404(db, session_id)
    svc.assert_can_edit(user, s)
    verdict = svc.run_evaluation(db, s)
    db.commit()
    return verdict


def _transition(db, s, fn, *args):
    fn(db, *args)
    db.commit()
    return _detail(db, s)


@router.post("/sessions/{session_id}/submit")
def submit(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = svc.get_session_or_404(db, session_id)
    return _transition(db, s, workflow.submit, user, s)


@router.post("/sessions/{session_id}/start-review")
def start_review(session_id: int, db: Session = Depends(get_db),
                 user: User = Depends(require_role(REVIEWER, ADMIN))):
    s = svc.get_session_or_404(db, session_id)
    return _transition(db, s, workflow.start_review, user, s)


@router.post("/sessions/{session_id}/approve")
def approve(session_id: int, body: Optional[CommentIn] = None, db: Session = Depends(get_db),
            user: User = Depends(require_role(REVIEWER, ADMIN))):
    s = svc.get_session_or_404(db, session_id)
    return _transition(db, s, workflow.approve, user, s)


@router.post("/sessions/{session_id}/return")
def return_session(session_id: int, body: CommentIn, db: Session = Depends(get_db),
                   user: User = Depends(require_role(REVIEWER, ADMIN))):
    s = svc.get_session_or_404(db, session_id)
    return _transition(db, s, workflow.return_to_tester, user, s, body.comment or "")


# ------------------------------------------------------------------ attachments
@router.post("/attachments", status_code=201)
async def upload_attachment(file: UploadFile = File(...), session_id: int = Form(...),
                            kind: str = Form("photo"), caption: Optional[str] = Form(None),
                            db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = svc.get_session_or_404(db, session_id)
    svc.assert_can_edit(user, s)
    if kind not in ATTACHMENT_KINDS:
        raise HTTPException(422, f"kind must be one of {list(ATTACHMENT_KINDS)}")
    if file.content_type not in ALLOWED_UPLOADS:
        raise HTTPException(415, f"Only {', '.join(ALLOWED_UPLOADS)} are accepted")
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, f"File is larger than {settings.max_upload_bytes // (1024 * 1024)} MB")
    a = Attachment(session_id=s.id, kind=kind, filename=file.filename or "upload", content_type=file.content_type,
                   size_bytes=len(data), data=data, caption=caption, include_in_report=(kind == "photo"),
                   uploaded_by_id=user.id)
    db.add(a)
    db.commit()
    return {"id": a.id, "kind": a.kind, "filename": a.filename, "caption": a.caption, "size_bytes": a.size_bytes}


def _attachment(db, user, attachment_id) -> Attachment:
    a = db.get(Attachment, attachment_id)
    if a is None:
        raise HTTPException(404, "Attachment not found")
    return a


@router.get("/attachments/{attachment_id}")
def get_attachment(attachment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = _attachment(db, user, attachment_id)
    svc.assert_can_view(user, svc.get_session_or_404(db, a.session_id))
    return Response(a.data, media_type=a.content_type,
                    headers={"Content-Disposition": f'inline; filename="{a.filename}"'})


@router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = _attachment(db, user, attachment_id)
    svc.assert_can_edit(user, svc.get_session_or_404(db, a.session_id))
    db.delete(a)
    db.commit()
