"""Runs every test in a session and produces the overall verdict.
This is the single function the backend calls: evaluate_session(session, ruleset)."""
from .ruleset import Ruleset
from .schemas import SessionInput, Verdict
from .spec_check import check_spec
from . import evaluators as ev


def evaluate_session(session: SessionInput, rs: Ruleset) -> Verdict:
    spec = session.spec
    results, warnings = [], []

    spec_result = check_spec(spec, rs)
    for issue in spec_result.issues:
        warnings.append(f"Spec {issue.severity}: {issue.message} ({issue.clause})")

    e0 = ev.zero_reference_error(spec, session.zero_reference)

    results += ev.eval_weighing(session.weighing, spec, rs, e0)
    if session.eccentricity:
        results += ev.eval_eccentricity(session.eccentricity, spec, rs, e0)
    results += [ev.eval_repeatability(s, spec, rs) for s in session.repeatability if s.readings]
    results += [ev.eval_discrimination(x, spec, rs) for x in session.discrimination]
    if session.zero_setting:
        results.append(ev.eval_zero_setting(session.zero_setting, spec, rs))
    if session.tare_setting:
        results.append(ev.eval_tare_setting(session.tare_setting, spec, rs))
    if session.temperature:
        temp_results, temp_warnings = ev.eval_temperature(session.temperature, spec, rs, e0)
        results += temp_results
        warnings += temp_warnings
    results += [ev.eval_disturbance(x, spec, rs) for x in session.disturbances]

    # coverage checks on the weighing test
    min_loads, clause = rs.rule("weighing_test_min_loads")
    loads = {r.load for r in session.weighing}
    if session.weighing and len(loads) < min_loads:
        warnings.append(f"Weighing test used {len(loads)} distinct loads; at least {min_loads} expected ({clause}).")
    if session.weighing and spec.max_capacity not in loads:
        warnings.append("Weighing test does not include Max.")

    thr, thr_clause = rs.rule("rounding_elimination_threshold")
    if spec.actual_d > thr * spec.e and any(r.method == "naive" for r in results):
        warnings.append(f"Some readings have no changeover data (ΔL). {thr_clause} requires rounding "
                        f"error to be eliminated when d > {thr:g}e, so those results are not R 76-compliant.")

    failed = sorted({r.test for r in results if r.result == "FAIL"})
    if not spec_result.valid:
        overall = "FAIL"
        failed = ["spec_check"] + failed
    elif not session.weighing:
        overall = "INCOMPLETE"
        warnings.append("No weighing test readings entered yet.")
    else:
        overall = "FAIL" if failed else "PASS"

    return Verdict(
        overall=overall,
        ruleset_id=rs.id,
        ruleset_version=rs.version,
        results=results,
        failed_tests=failed,
        marginal_results=sum(r.marginal for r in results),
        rounding_traps=sum(1 for r in results if r.naive_result and r.naive_result != r.result),
        warnings=warnings,
    )