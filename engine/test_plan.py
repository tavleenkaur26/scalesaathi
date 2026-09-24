"""Generates the test plan for an instrument so the officer doesn't have to open the standard.
Key idea: include loads right at the MPE band boundaries, because that's where the allowed
error jumps and where a scale is most likely to flip from pass to fail."""
import math
from .calc import round_to_interval
from .ruleset import Ruleset
from .schemas import InstrumentSpec


def generate_test_plan(spec: InstrumentSpec, rs: Ruleset) -> dict:
    e, d = spec.e, spec.actual_d
    mx, mn = spec.max_capacity, spec.min_capacity
    cls = spec.accuracy_class

    # ---------- weighing test loads ----------
    min_loads, weigh_clause = rs.rule("weighing_test_min_loads")
    points = {}  # load -> reason

    def add(load, reason):
        load = round_to_interval(load, e)
        if mn <= load <= mx and load not in points:
            points[load] = reason

    add(mn, "Minimum capacity (Min)")
    for m in rs.band_boundaries(cls):
        boundary = m * e
        if boundary < mx:
            add(boundary, f"MPE band boundary at {m:g}e: allowed error changes here")
            add(boundary + e, f"Just above the {m:g}e boundary: the larger MPE starts")
    add(mx / 2, "50% of Max")
    add(mx, "Maximum capacity (Max)")

    # fill the largest gaps with round intermediate loads until the minimum count is reached
    guard = 0
    while len(points) < min_loads and guard < 100:
        guard += 1
        loads = sorted(points)
        gaps = sorted(zip(loads, loads[1:]), key=lambda p: p[1] - p[0], reverse=True)
        added = False
        for a, b in gaps:
            gap = b - a
            nice = max(e, round_to_interval(10 ** math.floor(math.log10(gap)) / 10, e))
            mid = round(round(((a + b) / 2) / nice) * nice, 6)
            if a < mid < b and mid not in points:
                add(mid, "Intermediate load")
                added = True
                break
        if not added:
            break

    weighing = [{"load": l, "load_in_e": round(l / e, 3),
                 "mpe": rs.mpe(cls, l, e)["mpe"], "reason": r,
                 "boundary": "boundary" in r.lower()}
                for l, r in sorted(points.items())]

    # ---------- eccentricity ----------
    ecc_rule, ecc_clause = rs.rule("eccentricity")
    base = mx + spec.max_tare
    if spec.support_points <= 4:
        ecc_load = round_to_interval(base * ecc_rule["fraction_up_to_4_supports"], e)
        positions = ["Centre", "Segment 1", "Segment 2", "Segment 3", "Segment 4"]
    else:
        n_sup = spec.support_points
        ecc_load = round_to_interval(base / (n_sup - ecc_rule["per_support_divisor_offset"]), e)
        positions = ["Centre"] + [f"Over support {i}" for i in range(1, n_sup + 1)]

    # ---------- repeatability ----------
    _, rep_clause = rs.rule("repeatability_weighings")
    n_weighings = rs.repeatability_count(mx)
    repeatability = [
        {"load": round_to_interval(mx * 0.5, e), "weighings": n_weighings},
        {"load": mx, "weighings": n_weighings},
    ]

    # ---------- discrimination ----------
    extra, disc_clause = rs.rule("discrimination_extra_load_d")
    discrimination = [{"load": l, "extra_load": round(extra * d, 6)}
                      for l in (mn, round_to_interval(mx / 2, e), mx)]

    # ---------- temperature ----------
    (default_lo, default_hi), _ = rs.rule("default_temperature_range_c")
    lo = spec.temp_min if spec.temp_min is not None else default_lo
    hi = spec.temp_max if spec.temp_max is not None else default_hi
    _, temp_clause = rs.rule("temperature_test_sequence_c")
    ref = (lo + hi) / 2 if cls == "I" else 20       # class I: mean of the limits
    temps = [ref, hi, lo] + ([5] if lo <= 0 else []) + [ref]

    return {
        "ruleset_version": rs.version,
        "weighing": {"clause": weigh_clause, "points": weighing,
                     "note": "Apply increasing loads up to Max, then decreasing back to zero."},
        "eccentricity": {"clause": ecc_clause, "load": ecc_load, "positions": positions,
                         "mpe": rs.mpe(cls, ecc_load, e)["mpe"]},
        "repeatability": {"clause": rep_clause, "series": repeatability},
        "discrimination": {"clause": disc_clause, "points": discrimination},
        "zero_setting": {"clause": rs.rule("zero_setting_accuracy_e")[1],
                         "limit": rs.rule("zero_setting_accuracy_e")[0] * e},
        "tare_setting": {"clause": rs.rule("tare_setting_accuracy_e")[1],
                         "limit": rs.rule("tare_setting_accuracy_e")[0] * e},
        "temperature": {"clause": temp_clause, "sequence_c": temps},
    }
