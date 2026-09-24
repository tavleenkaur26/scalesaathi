"""The ONLY module that imports the rule engine. If P1 changes the engine API, fix it here."""
from typing import Any, Optional

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from engine import (InstrumentSpec, SessionInput, check_spec, evaluate_session,
                    generate_test_plan, load_ruleset_from_dict, ruleset_impact)
from engine.reading_check import check_session_readings

from backend.constants import OBSERVATION_TESTS
from backend.models import Instrument, RulesetVersion

_cache: dict[str, Any] = {}     # version -> Ruleset (rulesets are immutable once stored)


def pydantic_422(e: ValidationError) -> HTTPException:
    return HTTPException(422, detail=e.errors(include_url=False, include_context=False, include_input=False))


def get_ruleset(db: Session, version: Optional[str] = None):
    q = db.query(RulesetVersion)
    row = q.filter_by(version=version).first() if version else q.filter_by(is_active=True).first()
    if row is None:
        raise HTTPException(404 if version else 500, f"Ruleset {version or '(active)'} not found")
    if row.version not in _cache:
        _cache[row.version] = load_ruleset_from_dict(row.data)
    return _cache[row.version]


def parse_ruleset(data: dict):
    try:
        return load_ruleset_from_dict(data)
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(422, f"Invalid ruleset: {e}")


def spec_of(inst: Instrument) -> InstrumentSpec:
    return InstrumentSpec(
        max_capacity=inst.max_capacity, min_capacity=inst.min_capacity, e=inst.e, d=inst.d,
        accuracy_class=inst.accuracy_class, max_tare=inst.max_tare or 0,
        support_points=inst.support_points or 4, temp_min=inst.temp_min, temp_max=inst.temp_max)


def spec_check(spec: InstrumentSpec, rs) -> dict:
    return check_spec(spec, rs).model_dump(mode="json")


def make_test_plan(inst: Instrument, rs) -> dict:
    return generate_test_plan(spec_of(inst), rs)


def build_session_input(inst: Instrument, observations: dict[str, Any]) -> SessionInput:
    try:
        return SessionInput.model_validate({"spec": spec_of(inst).model_dump(), **observations})
    except ValidationError as e:
        raise pydantic_422(e)


def validate_observation(inst: Instrument, test: str, payload: Any) -> None:
    """Shape check (Pydantic) + reading rules (engine.check_session_readings). Raises 422."""
    if test not in OBSERVATION_TESTS:
        raise HTTPException(422, f"Unknown test '{test}'. Expected one of {list(OBSERVATION_TESTS)}")
    si = build_session_input(inst, {test: payload})
    errors = [i.model_dump() for i in check_session_readings(si) if i.severity == "error"]
    if errors:
        raise HTTPException(422, detail={"message": "Invalid readings", "issues": errors})


def evaluate(si: SessionInput, rs) -> dict:
    return evaluate_session(si, rs).model_dump(mode="json")


def impact(sessions: dict[str, SessionInput], old_rs, new_rs) -> dict:
    return ruleset_impact(sessions, old_rs, new_rs)
