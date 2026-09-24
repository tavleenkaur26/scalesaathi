"""Quick demo: python -m engine.demo"""
from engine import load_ruleset, check_spec, generate_test_plan, evaluate_session
from engine.schemas import InstrumentSpec, Reading, SessionInput

rs = load_ruleset("v1")
spec = InstrumentSpec(max_capacity=15000, min_capacity=100, e=5, accuracy_class="III")

print("SPEC CHECK:", check_spec(spec, rs).model_dump(exclude={"matched_band"}))
print("\nTEST PLAN (weighing loads):")
for p in generate_test_plan(spec, rs)["weighing"]["points"]:
    print(f"  {p['load']:>8g} g  ({p['load_in_e']:g}e)  MPE ±{p['mpe']:g} g  - {p['reason']}")

v = evaluate_session(SessionInput(spec=spec, weighing=[
    Reading(load=5000, indication=5005, delta_l=0.5, label="increasing"),
]), rs)
r = v.results[0]
print(f"\nROUNDING TRAP at {r.load:g} g:")
print(f"  Naive (indication - load): {r.naive_error:+g} g -> {r.naive_result}")
print(f"  R 76 changeover method:    {r.error:+g} g -> {r.result}")
print(f"  {r.explanation}")

print(f"\nUnverified ruleset items: {len(rs.unverified_items())}")
