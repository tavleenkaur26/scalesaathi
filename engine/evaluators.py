"""One evaluator per R 76 test. Every result carries the error, the limit, the clause,
and a plain-English explanation, so no verdict is a black box."""
from typing import Optional
from .calc import naive_error, changeover_error, corrected_error
from .ruleset import Ruleset, EPS
from .schemas import (InstrumentSpec, Reading, TestResult, EccentricityInput,
                      RepeatabilitySeries, DiscriminationInput, TemperatureRun, DisturbanceInput)


def _outcome(error: float, limit: float) -> str:
    return "PASS" if abs(error) <= limit + EPS else "FAIL"


def _judge_against_mpe(test: str, r: Reading, spec: InstrumentSpec, rs: Ruleset,
                       e0: Optional[float], clause_prefix: str) -> TestResult:
    """Shared logic: compare a reading's error with the MPE for its load."""
    e, d = spec.e, spec.actual_d
    mpe_info = rs.mpe(spec.accuracy_class, r.load, e)
    mpe = mpe_info["mpe"]
    naive = naive_error(r)
    err = corrected_error(r, e, e0)
    method = "changeover" if err is not None else "naive"
    final_err = err if err is not None else naive

    result = _outcome(final_err, mpe)
    naive_result = _outcome(naive, mpe)
    util = round(abs(final_err) / mpe, 4) if mpe else None
    marginal = result == "PASS" and util is not None and util >= rs.advisory("marginal_threshold") - EPS

    lo, hi = mpe_info["band"]
    band_txt = f"{lo:g}e to {hi:g}e" if hi is not None else f"above {lo:g}e"
    expl = (f"Error {final_err:+g} g vs MPE ±{mpe:g} g "
            f"(load = {mpe_info['m']:g}e, band {band_txt}, MPE = {mpe_info['mpe_e']:g}e). ")
    if method == "changeover":
        expl += f"Changeover method (A.4.4.3): E = I + e/2 - ΔL - L = {r.indication:g} + {e/2:g}"
        if e0 is not None:
            expl += f", corrected by E0 = {e0:+g}"
        expl += ". "
        if naive_result != result:
            expl += (f"Rounding trap: the naive reading (indication - load = {naive:+g} g) "
                     f"would have given {naive_result}. ")
    else:
        expl += "No changeover data entered, so only the rounded (naive) error is available. "
        thr, thr_clause = rs.rule("rounding_elimination_threshold")
        if d > thr * e + EPS:
            expl += (f"Warning: {thr_clause} requires the rounding error to be eliminated when d > {thr:g}e; "
                     "enter ΔL for an R 76-compliant result. ")
    if marginal:
        expl += f"Marginal: uses {util*100:.0f}% of the MPE; in-service limits are only 2x wider, so drift may cause failure."

    return TestResult(test=test, label=r.label, load=r.load, e=e, error=final_err,
                      naive_error=naive, mpe=mpe, result=result, naive_result=naive_result,
                      utilisation=util, marginal=marginal, method=method,
                      clause=f"{clause_prefix}; {mpe_info['clause']}", explanation=expl.strip())


def zero_reference_error(spec: InstrumentSpec, zero_ref: Optional[Reading]) -> Optional[float]:
    if zero_ref is None:
        return None
    return changeover_error(zero_ref, spec.e)


# ------------------------- tests -------------------------

def eval_weighing(readings: list[Reading], spec, rs, e0) -> list[TestResult]:
    return [_judge_against_mpe("weighing", r, spec, rs, e0, "R76-1 A.4.4") for r in readings]


def eval_eccentricity(inp: EccentricityInput, spec, rs, e0) -> list[TestResult]:
    _, clause = rs.rule("eccentricity")
    return [_judge_against_mpe("eccentricity", r, spec, rs, e0, clause) for r in inp.readings]


def eval_repeatability(series: RepeatabilitySeries, spec, rs) -> TestResult:
    """Spread of repeated weighings of one load must not exceed |MPE| for that load."""
    _, clause = rs.rule("repeatability_weighings")
    d = spec.e
    load = series.readings[0].load
    errors = [changeover_error(r, d) if r.delta_l is not None else naive_error(r) for r in series.readings]
    spread = round(max(errors) - min(errors), 6)
    mpe_info = rs.mpe(spec.accuracy_class, load, spec.e)
    mpe = mpe_info["mpe"]
    result = "PASS" if spread <= mpe + EPS else "FAIL"
    expl = (f"{len(errors)} weighings of {load:g} g; spread of errors = {spread:g} g "
            f"vs allowed |MPE| = {mpe:g} g.")
    required = rs.repeatability_count(spec.max_capacity)
    if len(errors) < required:
        expl += (f" Warning: type approval requires {required} weighings per series for this Max, "
                 f"only {len(errors)} entered.")
    util = round(spread / mpe, 4)
    return TestResult(test="repeatability", load=load, e=spec.e, error=spread, mpe=mpe,
                      result=result, utilisation=util,
                      marginal=result == "PASS" and util >= rs.advisory("marginal_threshold") - EPS,
                      method="direct", clause=f"{clause}; {mpe_info['clause']}", explanation=expl)


def eval_discrimination(inp: DiscriminationInput, spec, rs) -> TestResult:
    """Adding 1.4 d at equilibrium must change the indication by at least one interval d."""
    extra, clause = rs.rule("discrimination_extra_load_d")
    d = spec.actual_d
    change = round(inp.indication_after - inp.indication_before, 6)
    result = "PASS" if change >= d - EPS else "FAIL"
    expl = (f"Added {extra*d:g} g ({extra:g}d) at {inp.load:g} g; indication changed by {change:g} g "
            f"(must change by at least d = {d:g} g).")
    return TestResult(test="discrimination", load=inp.load, e=spec.e, error=change, mpe=d,
                      result=result, method="direct", clause=clause, explanation=expl)


def _eval_setting_accuracy(test: str, rule: str, r: Reading, spec, rs) -> TestResult:
    """Zero-setting and tare-setting accuracy: error after setting must be within 0.25e."""
    factor, clause = rs.rule(rule)
    limit = factor * spec.e
    if r.delta_l is None:
        return TestResult(test=test, load=r.load, e=spec.e, result="FAIL", mpe=limit,
                          method="naive", clause=clause,
                          explanation="Changeover data (ΔL) is required: a rounded display cannot resolve 0.25e.")
    err = changeover_error(r, spec.e)
    result = _outcome(err, limit)
    util = round(abs(err) / limit, 4)
    return TestResult(test=test, load=r.load, e=spec.e, error=err, mpe=limit, result=result,
                      utilisation=util, method="changeover", clause=clause,
                      explanation=f"Error after setting = {err:+g} g vs limit ±{limit:g} g ({factor:g}e).")


def eval_zero_setting(r: Reading, spec, rs) -> TestResult:
    return _eval_setting_accuracy("zero_setting", "zero_setting_accuracy_e", r, spec, rs)


def eval_tare_setting(r: Reading, spec, rs) -> TestResult:
    return _eval_setting_accuracy("tare_setting", "tare_setting_accuracy_e", r, spec, rs)


def eval_temperature(runs: list[TemperatureRun], spec, rs, e0) -> tuple[list[TestResult], list[str]]:
    """MPE must hold at every test temperature, and the zero indication must not drift
    more than the allowed amount per degree between temperatures."""
    results, warnings = [], []
    (dlo, dhi), range_clause = rs.rule("default_temperature_range_c")
    lo = spec.temp_min if spec.temp_min is not None else dlo
    hi = spec.temp_max if spec.temp_max is not None else dhi
    _, temp_clause = rs.rule("temperature_test_sequence_c")

    for run in runs:
        if not (lo - EPS <= run.temperature <= hi + EPS):
            warnings.append(f"Test temperature {run.temperature:g} °C is outside the declared range "
                            f"{lo:g} to {hi:g} °C ({range_clause}).")
        for r in run.readings:
            res = _judge_against_mpe("temperature", r, spec, rs, e0, temp_clause)
            res.label = f"{run.temperature:g} °C" + (f" / {r.label}" if r.label else "")
            results.append(res)

    # zero drift between consecutive temperatures
    drift_rule, drift_clause = rs.rule("zero_temperature_drift")
    rule = drift_rule.get(spec.accuracy_class, drift_rule["default"])
    zeros = [(run.temperature, changeover_error(run.zero_reading, spec.e))
             for run in runs if run.zero_reading is not None and run.zero_reading.delta_l is not None]
    for (t1, z1), (t2, z2) in zip(zeros, zeros[1:]):
        dt = abs(t2 - t1)
        if dt < EPS:
            continue
        drift = round(abs(z2 - z1), 6)
        allowed = round(rule["e"] * spec.e * dt / rule["per_c"], 6)
        result = "PASS" if drift <= allowed + EPS else "FAIL"
        results.append(TestResult(
            test="temperature_zero_drift", label=f"{t1:g} → {t2:g} °C", e=spec.e,
            error=drift, mpe=allowed, result=result, method="changeover", clause=drift_clause,
            explanation=(f"Zero indication drifted {drift:g} g over {dt:g} °C; allowed "
                         f"{rule['e']:g}e per {rule['per_c']:g} °C = {allowed:g} g.")))
    return results, warnings


def eval_disturbance(inp: DisturbanceInput, spec, rs) -> TestResult:
    """Record-only tests (EMC, voltage etc.): the difference caused by the disturbance
    must not be a significant fault (greater than e)."""
    factor, clause = rs.rule("significant_fault_e")
    limit = factor * spec.e
    diff = round(abs(inp.indication_with - inp.indication_without), 6)
    result = "PASS" if diff <= limit + EPS else "FAIL"
    return TestResult(test="disturbance", label=inp.name, e=spec.e, error=diff, mpe=limit,
                      result=result, method="direct", clause=clause,
                      explanation=(f"{inp.name}: indication changed by {diff:g} g under disturbance; "
                                   f"a significant fault is anything above {limit:g} g ({factor:g}e). "
                                   "Recorded from the laboratory test sheet."))