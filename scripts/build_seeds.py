"""Builds engine/seeds/*.json. Run from the repo root: python scripts/build_seeds.py
Each seed = one labelled SessionInput payload plus the hand-derived expected result.
Base instrument: class III, Max 15 kg, Min 100 g, e = d = 5 g (MPE ±2.5 / ±5 / ±7.5 g)."""
import copy, json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "engine" / "seeds"
SPEC = {"max_capacity": 15000, "min_capacity": 100, "e": 5, "accuracy_class": "III",
        "max_tare": 0, "support_points": 4}
PLAN_LOADS = [100, 2500, 2505, 5000, 6200, 7500, 10000, 10005, 12500, 15000]
DL_CYCLE = [2.5, 2.0, 3.0, 1.5]   # errors 0, +0.5, -0.5, +1.0 g: comfortably inside every MPE


def r(load, ind, dl, label=None):
    x = {"load": load, "indication": ind, "delta_l": dl}
    if label:
        x["label"] = label
    return x


def clean_session():
    weighing = []
    for i, L in enumerate(PLAN_LOADS):
        weighing.append(r(L, L, DL_CYCLE[i % 4], "increasing"))
    for i, L in enumerate(reversed(PLAN_LOADS)):
        weighing.append(r(L, L, DL_CYCLE[(i + 1) % 4], "decreasing"))
    return {
        "spec": dict(SPEC),
        "zero_reference": r(50, 50, 2.5, "10e"),
        "weighing": weighing,
        "eccentricity": {"readings": [r(5000, 5000, dl, pos) for pos, dl in zip(
            ["Centre", "Segment 1", "Segment 2", "Segment 3", "Segment 4"], [2.5, 2.0, 3.0, 2.5, 2.0])]},
        "repeatability": [
            {"readings": [r(7500, 7500, [2.0, 2.5, 3.0][i % 3]) for i in range(10)]},
            {"readings": [r(15000, 15000, [2.5, 3.0, 2.0][i % 3]) for i in range(10)]},
        ],
        "discrimination": [{"load": L, "indication_before": L, "indication_after": L + 5}
                           for L in (100, 7500, 15000)],
        "zero_setting": r(0, 0, 2.5),
        "tare_setting": r(0, 0, 2.0),
        "temperature": [
            {"temperature": t, "zero_reading": r(0, 0, zdl),
             "readings": [r(L, L, 2.5) for L in (100, 7500, 15000)]}
            for t, zdl in zip([20, 40, -10, 5, 20], [2.5, 2.0, 3.0, 2.5, 2.5])],
        "disturbances": [
            {"name": "Voltage variation", "indication_without": 7500, "indication_with": 7500},
            {"name": "Short-time power reduction", "indication_without": 7500, "indication_with": 7505},
            {"name": "Electrostatic discharge", "indication_without": 7500, "indication_with": 7500},
        ],
    }


def set_weighing(s, load, label, ind, dl):
    for x in s["weighing"]:
        if x["load"] == load and x.get("label") == label:
            x["indication"], x["delta_l"] = ind, dl
            return s
    raise ValueError(load)


seeds = []

seeds.append({"id": "01_normal_pass", "label": "Normal pass",
    "description": "Every R 76 test run, all errors well inside the MPE.",
    "meta": {"manufacturer": "Demo Weighing Co.", "model": "DW-15", "instrument_type": "Bench scale"},
    "expected": {"overall": "PASS", "rounding_traps": 0, "marginal_results": 0},
    "session": clean_session()})

s = set_weighing(clean_session(), 15000, "increasing", 15020, 2.5)   # E = +20 vs ±7.5
seeds.append({"id": "02_clear_fail", "label": "Clear fail at Max",
    "description": "At Max (15 kg) the error is +20 g against an MPE of ±7.5 g. Naive and R 76 methods agree.",
    "meta": {"manufacturer": "Demo Weighing Co.", "model": "DW-15X", "instrument_type": "Bench scale"},
    "expected": {"overall": "FAIL", "failed_tests": ["weighing"], "rounding_traps": 0},
    "session": s})

s = set_weighing(clean_session(), 5000, "increasing", 5005, 0.5)     # naive +5 PASS, true +7 FAIL
seeds.append({"id": "03_rounding_trap", "label": "Rounding trap: naive PASS, R 76 FAIL",
    "description": "At 5 kg the display shows 5005 g (naive error +5 g = exactly the ±5 g MPE, so PASS). "
                   "The changeover method (ΔL = 0.5 g) reveals the true error is +7 g: FAIL. "
                   "A naive tool would approve this faulty scale.",
    "meta": {"manufacturer": "Sample Scales Ltd.", "model": "SS-150", "instrument_type": "Platform scale"},
    "expected": {"overall": "FAIL", "failed_tests": ["weighing"], "rounding_traps": 1},
    "session": s})

s = set_weighing(clean_session(), 2500, "increasing", 2505, 5.0)     # naive +5 FAIL, true +2.5 PASS
seeds.append({"id": "04_reverse_rounding_trap", "label": "Rounding trap: naive FAIL, R 76 PASS",
    "description": "At 2.5 kg the display shows 2505 g (naive error +5 g, above the ±2.5 g MPE, so FAIL). "
                   "The changeover method (ΔL = 5 g) shows the true error is +2.5 g: PASS (marginal). "
                   "A naive tool would reject this good scale.",
    "meta": {"manufacturer": "Sample Scales Ltd.", "model": "SS-150B", "instrument_type": "Platform scale"},
    "expected": {"overall": "PASS", "rounding_traps": 1, "marginal_results": 1},
    "session": s})

s = set_weighing(clean_session(), 12500, "increasing", 12505, 1.5)   # E = +6 of ±7.5 = 80%
seeds.append({"id": "05_marginal_pass", "label": "Marginal pass",
    "description": "At 12.5 kg the error is +6 g against ±7.5 g (80% of the MPE). Passes type evaluation, "
                   "flagged for reviewer attention.",
    "meta": {"manufacturer": "Demo Weighing Co.", "model": "DW-15M", "instrument_type": "Bench scale"},
    "expected": {"overall": "PASS", "rounding_traps": 0, "marginal_results": 1},
    "session": s})

s = clean_session()
set_weighing(s, 2500, "increasing", 2505, 4.5)    # E = +3 vs ±2.5 at 500e  -> FAIL
set_weighing(s, 2505, "increasing", 2510, 4.5)    # E = +3 vs ±5   at 501e  -> PASS
seeds.append({"id": "06_band_boundary", "label": "Fails exactly at the MPE band boundary",
    "description": "The same +3 g error fails at 2500 g (500e, MPE ±2.5 g) but passes at 2505 g "
                   "(501e, MPE ±5 g). Shows why the test plan targets band boundaries (R76-1 A.4.4.1).",
    "meta": {"manufacturer": "Sample Scales Ltd.", "model": "SS-150C", "instrument_type": "Platform scale"},
    "expected": {"overall": "FAIL", "failed_tests": ["weighing"]},
    "session": s})

s = clean_session()
s["spec"]["max_capacity"] = 100000   # n = 20000 > 10000 for class III
seeds.append({"id": "07_wrong_class_spec", "label": "Wrong-class specification",
    "description": "Declared class III with Max 100 kg and e = 5 g gives n = 20000, above the class III "
                   "limit of 10000 (R76-1 Table 3). Invalid before any testing.",
    "meta": {"manufacturer": "Demo Weighing Co.", "model": "DW-100", "instrument_type": "Platform scale"},
    "expected": {"overall": "FAIL", "failed_tests_include": ["spec_check"]},
    "session": s})

s = clean_session()
s["eccentricity"]["readings"][3] = r(5000, 5010, 0.5, "Segment 3")   # E = +12 vs ±5
seeds.append({"id": "08_eccentricity_fail", "label": "Eccentricity fail at one corner",
    "description": "Accurate at the centre, but at segment 3 the error is +12 g against ±5 g. "
                   "Typical of a damaged load cell.",
    "meta": {"manufacturer": "Sample Scales Ltd.", "model": "SS-60", "instrument_type": "Platform scale"},
    "expected": {"overall": "FAIL", "failed_tests": ["eccentricity"]},
    "session": s})

full = clean_session()
seeds.append({"id": "09_in_progress", "label": "Session in progress",
    "description": "Only the zero reference and eccentricity entered so far. For the dashboard's "
                   "'in process' state.",
    "meta": {"manufacturer": "Demo Weighing Co.", "model": "DW-30", "instrument_type": "Bench scale"},
    "expected": {"overall": "INCOMPLETE"},
    "session": {"spec": full["spec"], "zero_reference": full["zero_reference"],
                "eccentricity": full["eccentricity"]}})

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.json"):
    old.unlink()
for seed in seeds:
    (OUT / f"{seed['id']}.json").write_text(json.dumps(seed, indent=2, ensure_ascii=False))
print(f"Wrote {len(seeds)} seeds to {OUT}")