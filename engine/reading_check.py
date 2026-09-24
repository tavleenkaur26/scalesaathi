"""Validates individual readings against the instrument spec.

Responsibility: the engine owns these rules. The backend calls check_session_readings()
(or check_reading() for one test) when readings are saved and rejects errors with a 422.
The frontend may mirror the simple checks for instant feedback, but the engine is the source of truth.
"""
from .ruleset import EPS
from .schemas import (InstrumentSpec, Reading, SessionInput, SpecIssue,
                      DiscriminationInput, DisturbanceInput)


def _not_multiple(value: float, step: float) -> bool:
    return abs(round(value / step) * step - value) > 1e-6


def _check_indication(value: float, spec: InstrumentSpec, path: str) -> list[SpecIssue]:
    d = spec.actual_d
    if _not_multiple(value, d):
        return [SpecIssue(field=path, severity="error", clause="R76-1 4.2.2.1",
                          message=f"Indication {value:g} g is not a multiple of the scale interval d = {d:g} g; "
                                  "the display cannot show this value.")]
    return []


def check_reading(r: Reading, spec: InstrumentSpec, path: str = "reading") -> list[SpecIssue]:
    issues: list[SpecIssue] = []
    limit = spec.max_capacity + spec.max_tare
    if r.load > limit + EPS:
        issues.append(SpecIssue(field=f"{path}.load", severity="error", clause="-",
                                message=f"Load {r.load:g} g exceeds Max + max tare = {limit:g} g."))
    issues += _check_indication(r.indication, spec, f"{path}.indication")
    if r.delta_l is not None and r.delta_l > spec.e + EPS:
        issues.append(SpecIssue(field=f"{path}.delta_l", severity="error", clause="R76-1 A.4.4.3",
                                message=f"ΔL = {r.delta_l:g} g is more than one interval e = {spec.e:g} g; "
                                        "the display should have changed over already. Re-check the reading."))
    return issues


def _check_discrimination(x: DiscriminationInput, spec, path) -> list[SpecIssue]:
    return (_check_indication(x.indication_before, spec, f"{path}.indication_before")
            + _check_indication(x.indication_after, spec, f"{path}.indication_after"))


def _check_disturbance(x: DisturbanceInput, spec, path) -> list[SpecIssue]:
    return (_check_indication(x.indication_without, spec, f"{path}.indication_without")
            + _check_indication(x.indication_with, spec, f"{path}.indication_with"))


def check_session_readings(session: SessionInput) -> list[SpecIssue]:
    """Checks every reading in a session. `field` is a path like 'weighing[3].indication'."""
    spec = session.spec
    out: list[SpecIssue] = []
    if session.zero_reference:
        out += check_reading(session.zero_reference, spec, "zero_reference")
    for i, r in enumerate(session.weighing):
        out += check_reading(r, spec, f"weighing[{i}]")
    if session.eccentricity:
        for i, r in enumerate(session.eccentricity.readings):
            out += check_reading(r, spec, f"eccentricity.readings[{i}]")
    for s, series in enumerate(session.repeatability):
        for i, r in enumerate(series.readings):
            out += check_reading(r, spec, f"repeatability[{s}].readings[{i}]")
    for i, x in enumerate(session.discrimination):
        out += _check_discrimination(x, spec, f"discrimination[{i}]")
    if session.zero_setting:
        out += check_reading(session.zero_setting, spec, "zero_setting")
    if session.tare_setting:
        out += check_reading(session.tare_setting, spec, "tare_setting")
    for t, run in enumerate(session.temperature):
        for i, r in enumerate(run.readings):
            out += check_reading(r, spec, f"temperature[{t}].readings[{i}]")
        if run.zero_reading:
            out += check_reading(run.zero_reading, spec, f"temperature[{t}].zero_reading")
    for i, x in enumerate(session.disturbances):
        out += _check_disturbance(x, spec, f"disturbances[{i}]")
    return out