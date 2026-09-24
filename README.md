# NAWI R 76 Rule Engine (P1)

Pure-Python engine for SIH26035. No web framework inside: the backend (P2) imports it.
All masses are in grams.

## Run
    pip install -r requirements.txt
    python -m pytest -q          # golden test suite
    python -m engine.demo        # rounding-trap demo in the terminal

## Structure
    engine/rulesets/oiml_r76_v1.json   every limit, clause-tagged, versioned
    engine/ruleset.py                  loads rulesets, MPE lookup
    engine/schemas.py                  input/output contract (Pydantic)
    engine/calc.py                     changeover-point + naive error
    engine/spec_check.py               class / n / Min / e-form checks
    engine/test_plan.py                auto test plan incl. band-boundary loads
    engine/evaluators.py               one evaluator per R 76 test
    engine/verdict.py                  evaluate_session() -> overall verdict
    engine/impact.py                   ruleset_impact() for new OIML versions
    tests/test_golden.py               hand-calculated cases

## Backend usage (P2)
    from engine import (load_ruleset, load_ruleset_from_dict, check_spec,
                        generate_test_plan, evaluate_session, ruleset_impact,
                        InstrumentSpec, SessionInput)

    rs = load_ruleset("v1")
    check_spec(spec, rs)                    # POST /instruments/validate-spec
    generate_test_plan(spec, rs)            # GET  /instruments/{id}/test-plan
    evaluate_session(session, rs)           # POST /sessions/{id}/evaluate
    ruleset_impact(sessions, old, new)      # GET  /rulesets/{v}/impact
    # all return Pydantic models / dicts -> .model_dump() for JSON

## Before real use
Every value in the ruleset has "verified": false. Check each one against the
OIML R 76-1 PDF and flip it to true. `load_ruleset("v1").unverified_items()`
lists what is left.
