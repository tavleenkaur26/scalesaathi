from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_role
from backend.constants import ADMIN, REVIEWER, TESTER
from backend.db import get_db
from backend.models import RulesetVersion, TestSession, User
from backend.services import engine_adapter as ea, seed, sessions as svc
from backend.services.sessions import iso

router = APIRouter(tags=["rulesets & demo"])


def _row(r: RulesetVersion) -> dict:
    return {"version": r.version, "ruleset_id": r.ruleset_id, "is_active": r.is_active,
            "created_at": iso(r.created_at)}


@router.get("/rulesets")
def list_rulesets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [_row(r) for r in db.query(RulesetVersion).order_by(RulesetVersion.id).all()]


@router.post("/rulesets", status_code=201)
def create_ruleset(data: dict[str, Any] = Body(...), activate: bool = False, db: Session = Depends(get_db),
                   user: User = Depends(require_role(ADMIN))):
    """Body = the full ruleset JSON. Validated by the engine before it is stored."""
    rs = ea.parse_ruleset(data)
    if db.query(RulesetVersion).filter_by(version=rs.version).first():
        raise HTTPException(409, f"Ruleset version {rs.version} already exists")
    if activate:
        db.query(RulesetVersion).update({"is_active": False})
    row = RulesetVersion(version=rs.version, ruleset_id=rs.id, data=data, is_active=activate,
                         created_by_id=user.id)
    db.add(row)
    db.commit()
    return _row(row)


@router.post("/rulesets/{version}/activate")
def activate_ruleset(version: str, db: Session = Depends(get_db), user: User = Depends(require_role(ADMIN))):
    row = db.query(RulesetVersion).filter_by(version=version).first()
    if row is None:
        raise HTTPException(404, "Ruleset version not found")
    db.query(RulesetVersion).update({"is_active": False})
    row.is_active = True
    db.commit()
    return _row(row)


@router.get("/rulesets/{version}/impact")
def ruleset_impact(version: str, db: Session = Depends(get_db),
                   user: User = Depends(require_role(ADMIN, REVIEWER))):
    """Re-runs every stored session under `version` and reports which verdicts would change.
    Dry run only: nothing stored is modified."""
    new_rs, old_rs = ea.get_ruleset(db, version), ea.get_ruleset(db)
    sessions = {}
    for s in db.query(TestSession).all():
        obs = svc.observations_of(s)
        if obs.get("weighing"):
            try:
                sessions[s.id] = ea.build_session_input(s.instrument, obs)
            except HTTPException:
                continue
    return ea.impact(sessions, old_rs, new_rs)


@router.post("/demo/load-sample")
def load_sample(db: Session = Depends(get_db), user: User = Depends(require_role(TESTER, ADMIN))):
    """Loads the demo history (idempotent) and returns a Draft session, owned by the caller,
    pre-filled with the rounding-trap case: press Evaluate to see Naive PASS vs R 76 FAIL."""
    s = seed.ensure_sample_draft(db, user)
    db.commit()
    return {"instrument_id": s.instrument_id, "session_id": s.id}
