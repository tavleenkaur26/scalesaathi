"""Query layer for P4's repository, history, dashboard and failure-insight pages."""
import csv
import io
from datetime import datetime
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.constants import APPROVED, IN_PROGRESS, IN_REVIEW, TESTER
from backend.models import AuditLog, Instrument, Manufacturer, Report, Result, TestSession, User
from backend.services.sessions import iso

CSV_COLUMNS = ["session_id", "report_no", "instrument_id", "model", "serial_no", "manufacturer",
               "accuracy_class", "verdict", "status", "tested_at", "approved_at", "approved_by",
               "marginal_results", "rounding_traps"]


def _item(s: TestSession, rep: Optional[Report]) -> dict:
    i = s.instrument
    return {"session_id": s.id, "report_no": rep.report_no if rep else None, "instrument_id": i.id,
            "model": i.model, "serial_no": i.serial_no, "manufacturer": i.manufacturer.name,
            "accuracy_class": i.accuracy_class, "verdict": s.verdict_overall, "status": s.status,
            "tested_at": iso(s.tested_at), "approved_at": iso(rep.approved_at) if rep else None,
            "approved_by": rep.approved_by.full_name if rep else None,
            "marginal_results": s.marginal_results, "rounding_traps": s.rounding_traps}


def search_reports(db: Session, user: User, search=None, manufacturer=None, model=None, status=None,
                   verdict=None, date_from=None, date_to=None, page=1, page_size=25) -> dict:
    q = (db.query(TestSession, Report)
         .join(Instrument, TestSession.instrument_id == Instrument.id)
         .join(Manufacturer, Instrument.manufacturer_id == Manufacturer.id)
         .outerjoin(Report, Report.session_id == TestSession.id))
    if user.role == TESTER:                    # testers: everything approved + their own work
        q = q.filter(or_(TestSession.status == APPROVED, TestSession.tester_id == user.id))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Instrument.model.ilike(like), Instrument.serial_no.ilike(like),
                         Manufacturer.name.ilike(like), Report.report_no.ilike(like)))
    if manufacturer:
        q = q.filter(Manufacturer.name.ilike(f"%{manufacturer}%"))
    if model:
        q = q.filter(Instrument.model.ilike(f"%{model}%"))
    if status:
        q = q.filter(TestSession.status == status)
    if verdict:
        q = q.filter(TestSession.verdict_overall == verdict.upper())
    if date_from:
        q = q.filter(TestSession.tested_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(TestSession.tested_at <= datetime.fromisoformat(date_to + "T23:59:59"
                                                                     if len(date_to) == 10 else date_to))
    total = q.count()
    rows = (q.order_by(TestSession.tested_at.desc(), TestSession.id.desc())
            .offset((max(page, 1) - 1) * page_size).limit(page_size).all())
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_item(s, r) for s, r in rows]}


def export_csv(db: Session, user: User, **filters) -> str:
    items = search_reports(db, user, page=1, page_size=100000, **filters)["items"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=CSV_COLUMNS)
    w.writeheader()
    w.writerows(items)
    return buf.getvalue()


def instrument_history(db: Session, instrument_id: int) -> list[dict]:
    rows = (db.query(TestSession, Report).outerjoin(Report, Report.session_id == TestSession.id)
            .filter(TestSession.instrument_id == instrument_id)
            .order_by(TestSession.tested_at.desc(), TestSession.id.desc()).all())
    return [{"session_id": s.id, "tested_at": iso(s.tested_at), "status": s.status,
             "verdict": s.verdict_overall, "report_no": r.report_no if r else None} for s, r in rows]


def dashboard_stats(db: Session) -> dict:
    def count(statuses):
        return db.query(TestSession).filter(TestSession.status.in_(statuses)).count()
    review_count = count(IN_REVIEW)
    approved_pass = (db.query(TestSession).filter(TestSession.status == APPROVED,
                                                  TestSession.verdict_overall == "PASS").count())
    approved_fail = (db.query(TestSession).filter(TestSession.status == APPROVED,
                                                  TestSession.verdict_overall == "FAIL").count())
    events = (db.query(AuditLog).filter(AuditLog.description.isnot(None))
              .order_by(AuditLog.at.desc(), AuditLog.id.desc()).limit(10).all())
    return {"completed": count([APPROVED]), "in_progress": count(IN_PROGRESS),
            "under_review": review_count, "total": db.query(TestSession).count(),
            "instruments": db.query(Instrument).count(),
            "failed_tests": db.query(TestSession).filter(TestSession.verdict_overall == "FAIL").count(),
            "result_distribution": {"pass": approved_pass, "fail": approved_fail,
                                    "under_review": review_count},
            "recent_activity": [{"at": iso(e.at), "user": e.user_name, "action": e.action,
                                 "entity": e.entity, "description": e.description} for e in events]}


def failure_insights(db: Session) -> dict:
    done = (db.query(TestSession).filter(TestSession.verdict_overall.in_(["PASS", "FAIL"])).all())
    ids = [s.id for s in done]
    tests: dict[str, list[int]] = {}
    for r in (db.query(Result).filter(Result.session_id.in_(ids)).all() if ids else []):
        t = tests.setdefault(r.test, [0, 0])
        t[1] += 1
        t[0] += r.result == "FAIL"
    by_mfr: dict[str, list[int]] = {}
    by_model: dict[tuple, list[int]] = {}
    for s in done:
        failed = s.verdict_overall == "FAIL"
        m = by_mfr.setdefault(s.instrument.manufacturer.name, [0, 0])
        m[0] += 1
        m[1] += failed
        k = by_model.setdefault((s.instrument.manufacturer.name, s.instrument.model), [0, 0])
        k[0] += 1
        k[1] += failed
    return {
        "most_failed_tests": sorted(({"test": t, "failures": v[0], "total": v[1]} for t, v in tests.items()),
                                    key=lambda x: -x["failures"]),
        "failure_rate_by_manufacturer": sorted(
            ({"manufacturer": k, "sessions": v[0], "failed": v[1], "rate": round(v[1] / v[0], 3)}
             for k, v in by_mfr.items()), key=lambda x: -x["rate"]),
        "repeat_failing_models": sorted(
            ({"model": k[1], "manufacturer": k[0], "failed_sessions": v[1], "sessions": v[0],
              "repeat": v[1] >= 2} for k, v in by_model.items() if v[1] >= 1),
            key=lambda x: -x["failed_sessions"]),
    }
