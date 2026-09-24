"""Checks declared instrument specs against R 76 classification rules BEFORE any testing.
Wrong specs make every later test meaningless, so this runs live on the entry form."""
import math
from .ruleset import Ruleset, EPS
from .schemas import InstrumentSpec, SpecCheckResult, SpecIssue


def _is_interval_form(e: float, allowed: list) -> bool:
    k = math.floor(math.log10(e) + EPS)
    mantissa = e / (10 ** k)
    return any(abs(mantissa - a) < 1e-6 for a in allowed)


def check_spec(spec: InstrumentSpec, rs: Ruleset) -> SpecCheckResult:
    issues: list[SpecIssue] = []
    cls = rs.class_data(spec.accuracy_class)
    classification = cls["classification"]
    clause = classification["clause"]
    e, d = spec.e, spec.actual_d
    n = spec.max_capacity / e

    # 1. e must be 1, 2 or 5 x 10^k
    allowed, form_clause = rs.rule("scale_interval_form")
    if not _is_interval_form(e, allowed):
        issues.append(SpecIssue(field="e", severity="error", clause=form_clause,
                                message=f"e = {e} g is not of the form 1, 2 or 5 x 10^k."))

    # 2. d must not exceed e; only classes I and II may have d < e (auxiliary indicating device)
    aux_classes, aux_clause = rs.rule("auxiliary_indicating_classes")
    if d > e + EPS:
        issues.append(SpecIssue(field="d", severity="error", clause=aux_clause,
                                message=f"Actual interval d = {d} g cannot be larger than e = {e} g."))
    elif spec.accuracy_class not in aux_classes and abs(d - e) > EPS:
        issues.append(SpecIssue(field="d", severity="error", clause=aux_clause,
                                message=f"Class {spec.accuracy_class} instruments cannot have an auxiliary "
                                        f"indicating device, so e must equal d."))

    # 3. Max must be a whole number of intervals
    if abs(n - round(n)) > 1e-6:
        issues.append(SpecIssue(field="max_capacity", severity="error", clause=clause,
                                message=f"Max / e = {n:.4f} is not a whole number of intervals."))

    # 4. find the class band matching e, then check n and Min
    band = None
    for b in classification["bands"]:
        lo_ok = e >= b["e_min"] - EPS
        hi_ok = b["e_max"] is None or e <= b["e_max"] + EPS
        if lo_ok and hi_ok:
            band = b
            break

    if band is None:
        issues.append(SpecIssue(field="e", severity="error", clause=clause,
                                message=f"e = {e} g is not permitted for class {spec.accuracy_class}."))
    else:
        if n < band["n_min"] - EPS:
            issues.append(SpecIssue(field="max_capacity", severity="error", clause=clause,
                                    message=f"n = Max/e = {n:g} is below the class {spec.accuracy_class} minimum of {band['n_min']}."))
        if band["n_max"] is not None and n > band["n_max"] + EPS:
            issues.append(SpecIssue(field="max_capacity", severity="error", clause=clause,
                                    message=f"n = Max/e = {n:g} exceeds the class {spec.accuracy_class} maximum of {band['n_max']}."))
        min_required = band["min_capacity_e"] * e
        if spec.min_capacity < min_required - EPS:
            issues.append(SpecIssue(field="min_capacity", severity="error", clause=clause,
                                    message=f"Min = {spec.min_capacity:g} g is below the required {band['min_capacity_e']}e = {min_required:g} g."))

    # 5. basic sanity
    if spec.min_capacity >= spec.max_capacity:
        issues.append(SpecIssue(field="min_capacity", severity="error", clause="-",
                                message="Min must be smaller than Max."))
    if spec.temp_min is not None and spec.temp_max is not None and spec.temp_min >= spec.temp_max:
        issues.append(SpecIssue(field="temp_min", severity="error", clause="R76-1 3.9.2",
                                message="Lower temperature limit must be below the upper limit."))

    # 6. declared temperature range must be at least the class minimum width
    if spec.temp_min is not None and spec.temp_max is not None and spec.temp_max > spec.temp_min:
        widths, w_clause = rs.rule("temperature_range_min_width_c")
        need = widths[spec.accuracy_class]
        if spec.temp_max - spec.temp_min < need - EPS:
            issues.append(SpecIssue(field="temp_max", severity="error", clause=w_clause,
                                    message=f"Declared temperature range is {spec.temp_max - spec.temp_min:g} °C; "
                                            f"class {spec.accuracy_class} requires at least {need} °C."))

    valid = not any(i.severity == "error" for i in issues)
    return SpecCheckResult(valid=valid, n=round(n, 6), matched_band=band, issues=issues)