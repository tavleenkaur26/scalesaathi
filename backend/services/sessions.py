"""Session-level helpers: access rules, observation upsert, evaluation, serialisation."""
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.constants import ADMIN, EDITABLE, REVIEWER, TESTER
from backend.models import Observation, Result, TestSession, User
from backend.services import engine_adapter as ea


def iso(dt: datetime | None) -> str | None:
    """UTC ISO string at second precision (naive datetimes from SQLite are treated as UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def get_session_or_404(db: Session, session_id: int) -> TestSession:
    s = db.get(TestSession, session_id)
    if s is None:
        raise HTTPException(404, "Session not found")
    return s


def assert_can_view(user: User, s: TestSession) -> None:
    if user.role == TESTER and s.tester_id != user.id:
        raise HTTPException(403, "Testers can only view their own sessions")


def assert_can_edit(user: User, s: TestSession) -> None:
    if user.role not in (TESTER, ADMIN) or (user.role == TESTER and s.tester_id != user.id):
        raise HTTPException(403, "Only the session's tester (or an Admin) can change it")
    if s.status not in EDITABLE:
        raise HTTPException(409, f"Session is {s.status}; it is locked for editing")


def observations_of(s: TestSession) -> dict[str, Any]:
    return {o.test: o.payload for o in s.observations}


def save_observation(db: Session, s: TestSession, test: str, payload: Any) -> None:
    ea.validate_observation(s.instrument, test, payload)
    row = next((o for o in s.observations if o.test == test), None)
    if row:
        row.payload = payload
    else:
        s.observations.append(Observation(test=test, payload=payload))
    clear_evaluation(s)          # readings changed, so the old verdict is stale


def clear_evaluation(s: TestSession) -> None:
    s.results.clear()
    s.verdict_json = s.verdict_overall = None
    s.marginal_results = s.rounding_traps = 0


def run_evaluation(db: Session, s: TestSession) -> dict:
    rs = ea.get_ruleset(db)
    verdict = ea.evaluate(ea.build_session_input(s.instrument, observations_of(s)), rs)
    s.results.clear()
    for r in verdict["results"]:
        s.results.append(Result(
            test=r["test"], label=r.get("label"), load=r.get("load"), error=r.get("error"),
            naive_error=r.get("naive_error"), mpe=r.get("mpe"), result=r["result"],
            naive_result=r.get("naive_result"), marginal=r.get("marginal", False),
            method=r.get("method"), clause=r.get("clause"), data=r))
    s.verdict_json = verdict
    s.verdict_overall = verdict["overall"]
    s.marginal_results = verdict["marginal_results"]
    s.rounding_traps = verdict["rounding_traps"]
    s.ruleset_version = verdict["ruleset_version"]
    return verdict


def instrument_summary(i) -> dict:
    return {"id": i.id, "model": i.model, "serial_no": i.serial_no, "instrument_type": i.instrument_type,
            "manufacturer_id": i.manufacturer_id, "manufacturer": i.manufacturer.name,
            "accuracy_class": i.accuracy_class, "max_capacity": i.max_capacity,
            "min_capacity": i.min_capacity, "e": i.e, "d": i.d, "max_tare": i.max_tare,
            "support_points": i.support_points, "temp_min": i.temp_min, "temp_max": i.temp_max}


def session_summary(s: TestSession) -> dict:
    return {"id": s.id, "status": s.status, "instrument_id": s.instrument_id,
            "model": s.instrument.model, "serial_no": s.instrument.serial_no,
            "manufacturer": s.instrument.manufacturer.name, "tester": s.tester.full_name,
            "tested_at": iso(s.tested_at), "verdict": s.verdict_overall,
            "marginal_results": s.marginal_results, "rounding_traps": s.rounding_traps,
            "submitted_at": iso(s.submitted_at)}


def session_detail(s: TestSession) -> dict:
    out = session_summary(s)
    out.update({
        "instrument": instrument_summary(s.instrument), "location": s.location,
        "conditions": {"temperature_c": s.temperature_c, "humidity_pct": s.humidity_pct,
                       "pressure_hpa": s.pressure_hpa},
        "ruleset_version": s.ruleset_version, "observations": observations_of(s),
        "verdict_detail": s.verdict_json, "review_comment": s.review_comment,
        "reviewer": s.reviewer.full_name if s.reviewer else None,
        "report_no": None,
    })
    return out
