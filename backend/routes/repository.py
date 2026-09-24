from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.constants import APPROVED, TESTER
from backend.db import get_db
from backend.models import Report, TestSession, User
from backend.services import analytics, reporting, sessions as svc

router = APIRouter(tags=["reports & dashboard"])

FILTERS = ("search", "manufacturer", "model", "status", "verdict", "date_from", "date_to")


@router.get("/reports")
def list_reports(search: Optional[str] = None, manufacturer: Optional[str] = None, model: Optional[str] = None,
                 status: Optional[str] = None, verdict: Optional[str] = None, date_from: Optional[str] = None,
                 date_to: Optional[str] = None, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200),
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return analytics.search_reports(db, user, search, manufacturer, model, status, verdict, date_from,
                                    date_to, page, page_size)


@router.get("/reports/export.csv")
def export_csv(search: Optional[str] = None, manufacturer: Optional[str] = None, model: Optional[str] = None,
               status: Optional[str] = None, verdict: Optional[str] = None, date_from: Optional[str] = None,
               date_to: Optional[str] = None, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    text = analytics.export_csv(db, user, search=search, manufacturer=manufacturer, model=model, status=status,
                                verdict=verdict, date_from=date_from, date_to=date_to)
    return Response(text, media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="scalesaathi_reports.csv"'})


def _approved_session(db, user, session_id) -> TestSession:
    s = svc.get_session_or_404(db, session_id)
    if s.status != APPROVED:
        raise HTTPException(409, f"Report is only available once approved (this session is {s.status})")
    return s


def _generate(name: str, db, user, session_id: int, lang: str):
    s = _approved_session(db, user, session_id)
    try:
        import reports                                   # P4's package at the repo root
        fn = getattr(reports, name)
    except (ImportError, AttributeError):
        raise HTTPException(501, f"Report generator '{name}' is not installed yet (P4's /reports package)")
    return s, fn(reporting.get_report_context(db, s, lang))


@router.get("/reports/{session_id}/pdf")
def report_pdf(session_id: int, lang: str = "en", db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    s, data = _generate("generate_pdf", db, user, session_id, lang)
    return Response(data, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{_no(db, s)}.pdf"'})


@router.get("/reports/{session_id}/docx")
def report_docx(session_id: int, lang: str = "en", db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    s, data = _generate("generate_docx", db, user, session_id, lang)
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={"Content-Disposition": f'attachment; filename="{_no(db, s)}.docx"'})


def _no(db, s) -> str:
    rep = db.query(Report).filter_by(session_id=s.id).first()
    return rep.report_no if rep and rep.report_no else f"session-{s.id}"


@router.get("/reports/{session_id}/context")
def report_context(session_id: int, lang: str = "en", db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    """The exact dict P4's generators receive (binary `data` omitted). Approved sessions only."""
    return reporting.get_report_context(db, _approved_session(db, user, session_id), lang, with_bytes=False)


@router.get("/verify/{hash}")
def verify(hash: str, format: str = "html", db: Session = Depends(get_db)):
    """Public. Recomputes the hash from the stored record: 'genuine' only if nothing changed."""
    data = reporting.verify(db, hash)
    if format == "json":
        return data
    try:
        import reports
        page = reports.render_verify_page(data)          # optional hook for P4's verify.html
    except (ImportError, AttributeError):
        page = reporting.verify_html(data)
    return HTMLResponse(page, status_code=404 if data["status"] == "not_found" else 200)


@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return analytics.dashboard_stats(db)


@router.get("/dashboard/failure-insights")
def failure_insights(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return analytics.failure_insights(db)
