"""Golden test cases. Every expected value here was calculated by hand from the
formulas in R 76-1 so the engine can be trusted. Re-check them yourself once
the ruleset values are verified against the PDF.

Reference instrument used in most cases: class III, Max 15 kg, Min 100 g, e = d = 5 g
  n = 15000 / 5 = 3000
  MPE bands (class III): up to 500e (2500 g) -> ±0.5e = ±2.5 g
                         500e to 2000e (10000 g) -> ±1e = ±5 g
                         2000e to 10000e -> ±1.5e = ±7.5 g
"""
import copy
import pytest
from engine import (load_ruleset, load_ruleset_from_dict, check_spec, generate_test_plan,
                    evaluate_session, ruleset_impact, InstrumentSpec, Reading, SessionInput,
                    EccentricityInput, RepeatabilitySeries, DiscriminationInput,
                    TemperatureRun, DisturbanceInput)
from engine.calc import changeover_error

RS = load_ruleset("v1")
SPEC = InstrumentSpec(max_capacity=15000, min_capacity=100, e=5, accuracy_class="III")


def session(**kw):
    return SessionInput(spec=SPEC, **kw)


def only(verdict, test):
    return [r for r in verdict.results if r.test == test]


# ---------------- 1-5: spec sanity check ----------------

def test_01_valid_spec():
    res = check_spec(SPEC, RS)
    assert res.valid and res.n == 3000

def test_02_n_too_large_for_class_III():
    res = check_spec(SPEC.model_copy(update={"max_capacity": 100000}), RS)  # n = 20000 > 10000
    assert not res.valid and any("exceeds" in i.message for i in res.issues)

def test_03_e_not_in_1_2_5_form():
    res = check_spec(SPEC.model_copy(update={"e": 3, "max_capacity": 15000}), RS)
    assert not res.valid and any(i.field == "e" for i in res.issues)

def test_04_min_capacity_below_20e():
    res = check_spec(SPEC.model_copy(update={"min_capacity": 50}), RS)  # needs 20e = 100 g
    assert not res.valid and any(i.field == "min_capacity" for i in res.issues)

def test_05_n_too_small_in_lower_e_band():
    spec = InstrumentSpec(max_capacity=150, min_capacity=40, e=2, accuracy_class="III")  # n = 75 < 100
    assert not check_spec(spec, RS).valid


# ---------------- 6-7: MPE lookup at band boundaries ----------------

@pytest.mark.parametrize("load,expected", [(2500, 2.5), (2505, 5.0), (10000, 5.0), (10005, 7.5)])
def test_06_mpe_band_boundaries(load, expected):
    assert RS.mpe("III", load, 5)["mpe"] == expected

def test_07_changeover_formula():
    # E = I + d/2 - dL - L = 1000 + 2.5 - 0.5 - 1000 = 2.0
    assert changeover_error(Reading(load=1000, indication=1000, delta_l=0.5), 5) == 2.0


# ---------------- 8-10: rounding trap and marginal ----------------

def test_08_rounding_trap_naive_pass_true_fail():
    # 5000 g = 1000e -> MPE ±5 g. Naive error = +5 (PASS). True E = 5005 + 2.5 - 0.5 - 5000 = +7 (FAIL)
    v = evaluate_session(session(weighing=[Reading(load=5000, indication=5005, delta_l=0.5)]), RS)
    r = only(v, "weighing")[0]
    assert (r.naive_result, r.result, r.error) == ("PASS", "FAIL", 7.0)
    assert v.rounding_traps == 1 and "Rounding trap" in r.explanation

def test_09_rounding_trap_naive_fail_true_pass():
    # 1000 g = 200e -> MPE ±2.5 g. Naive error = +5 (FAIL). True E = 1005 + 2.5 - 5 - 1000 = +2.5 (PASS)
    v = evaluate_session(session(weighing=[Reading(load=1000, indication=1005, delta_l=5)]), RS)
    r = only(v, "weighing")[0]
    assert (r.naive_result, r.result, r.error) == ("FAIL", "PASS", 2.5)

def test_10_marginal_pass():
    # E = 2.0 of ±2.5 -> 80% used -> marginal
    v = evaluate_session(session(weighing=[Reading(load=1000, indication=1000, delta_l=0.5)]), RS)
    r = only(v, "weighing")[0]
    assert r.result == "PASS" and r.marginal and r.utilisation == 0.8


# ---------------- 11: zero correction ----------------

def test_11_zero_corrected_error():
    # E0 = 0 + 2.5 - 2.0 - 0 = 0.5 ; E = 2.0 ; Ec = 2.0 - 0.5 = 1.5
    v = evaluate_session(session(zero_reference=Reading(load=0, indication=0, delta_l=2.0),
                                 weighing=[Reading(load=1000, indication=1000, delta_l=0.5)]), RS)
    r = only(v, "weighing")[0]
    assert r.error == 1.5 and not r.marginal


# ---------------- 12-17: other tests ----------------

def test_12_eccentricity_one_corner_fails():
    ecc = EccentricityInput(readings=[
        Reading(load=5000, indication=5000, delta_l=2.5, label="Centre"),
        Reading(load=5000, indication=5010, delta_l=0.5, label="Segment 3"),  # E = +12 > 5
    ])
    v = evaluate_session(session(eccentricity=ecc, weighing=[Reading(load=1000, indication=1000, delta_l=2.5)]), RS)
    res = only(v, "eccentricity")
    assert [r.result for r in res] == ["PASS", "FAIL"] and v.overall == "FAIL"

def test_13_repeatability_pass_and_fail():
    base = [Reading(load=7500, indication=7500, delta_l=2.5),   # E = 0
            Reading(load=7500, indication=7500, delta_l=0.5),   # E = +2
            Reading(load=7500, indication=7495, delta_l=0.5)]   # E = -3  -> spread 5 = MPE -> PASS
    ok = evaluate_session(session(repeatability=[RepeatabilitySeries(readings=base)]), RS)
    assert only(ok, "repeatability")[0].result == "PASS"
    bad = base + [Reading(load=7500, indication=7505, delta_l=0.5)]  # E = +7 -> spread 10 -> FAIL
    ko = evaluate_session(session(repeatability=[RepeatabilitySeries(readings=bad)]), RS)
    assert only(ko, "repeatability")[0].result == "FAIL"

def test_14_discrimination():
    v = evaluate_session(session(discrimination=[
        DiscriminationInput(load=5000, indication_before=5000, indication_after=5005),
        DiscriminationInput(load=15000, indication_before=15000, indication_after=15000)]), RS)
    assert [r.result for r in only(v, "discrimination")] == ["PASS", "FAIL"]

def test_15_zero_setting_accuracy():
    # limit 0.25e = 1.25 g. dL=1.0 -> E = 1.5 FAIL ; dL=2.0 -> E = 0.5 PASS
    bad = evaluate_session(session(zero_setting=Reading(load=0, indication=0, delta_l=1.0)), RS)
    good = evaluate_session(session(zero_setting=Reading(load=0, indication=0, delta_l=2.0)), RS)
    assert only(bad, "zero_setting")[0].result == "FAIL"
    assert only(good, "zero_setting")[0].result == "PASS"

def test_16_temperature_zero_drift_and_range():
    runs = [TemperatureRun(temperature=20, zero_reading=Reading(load=0, indication=0, delta_l=2.5)),   # E0 = 0
            TemperatureRun(temperature=25, zero_reading=Reading(load=0, indication=10, delta_l=0.5)),  # E0 = 12
            TemperatureRun(temperature=50)]
    v = evaluate_session(session(temperature=runs), RS)
    drift = only(v, "temperature_zero_drift")[0]
    assert drift.result == "FAIL" and drift.mpe == 5.0     # 1e per 5 °C over 5 °C = 5 g
    assert any("outside the declared range" in w for w in v.warnings)

def test_17_disturbance_significant_fault():
    v = evaluate_session(session(disturbances=[
        DisturbanceInput(name="Voltage dip", indication_without=5000, indication_with=5005),
        DisturbanceInput(name="ESD", indication_without=5000, indication_with=5010)]), RS)
    assert [r.result for r in only(v, "disturbance")] == ["PASS", "FAIL"]


# ---------------- 18-20: verdict, impact, plan ----------------

def test_18_overall_verdicts():
    good = evaluate_session(session(weighing=[Reading(load=15000, indication=15000, delta_l=2.5)]), RS)
    assert good.overall == "PASS"
    bad_spec = evaluate_session(SessionInput(spec=SPEC.model_copy(update={"min_capacity": 50}),
                                             weighing=[Reading(load=15000, indication=15000, delta_l=2.5)]), RS)
    assert bad_spec.overall == "FAIL" and "spec_check" in bad_spec.failed_tests
    assert evaluate_session(session(), RS).overall == "INCOMPLETE"

def test_19_ruleset_impact_detects_flip():
    new_data = copy.deepcopy(RS.data)
    new_data["version"] = "2.0.0-test"
    new_data["classes"]["III"]["mpe"]["bands"][0]["mpe_e"] = 1.0  # hypothetical revision
    new = load_ruleset_from_dict(new_data)
    # E = 1005 + 2.5 - 4.5 - 1000 = 3.0 -> FAIL under ±2.5, PASS under ±5
    s = session(weighing=[Reading(load=1000, indication=1005, delta_l=4.5)])
    report = ruleset_impact({"S-001": s}, RS, new)
    assert report["verdicts_flipped"] == 1
    assert report["changes"][0]["overall_before"] == "FAIL"
    assert report["changes"][0]["overall_after"] == "PASS"

def test_20_test_plan_covers_boundaries():
    plan = generate_test_plan(SPEC, RS)
    loads = [p["load"] for p in plan["weighing"]["points"]]
    for must in (100, 2500, 2505, 10000, 10005, 7500, 15000):
        assert must in loads
    assert len(loads) >= 10
    assert plan["eccentricity"]["load"] == 5000
    assert plan["temperature"]["sequence_c"] == [20, 40, -10, 5, 20]
