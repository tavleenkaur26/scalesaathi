"""ScaleSaathi R 76 rule engine. Public API for the backend:

    from engine import (load_ruleset, load_ruleset_from_dict, check_spec, check_reading,
                        check_session_readings, generate_test_plan, evaluate_session,
                        ruleset_impact, load_seeds, TEST_SOURCE_FIELD)

All functions are pure (no global state, no I/O except load_ruleset/load_seeds reading files).
A loaded Ruleset is read-only and safe to cache and share across threads.
"""
from .ruleset import load_ruleset, load_ruleset_from_dict, Ruleset
from .spec_check import check_spec
from .reading_check import check_reading, check_session_readings
from .test_plan import generate_test_plan
from .verdict import evaluate_session
from .impact import ruleset_impact
from .seed_loader import load_seeds
from .schemas import (InstrumentSpec, Reading, EccentricityInput, RepeatabilitySeries,
                      DiscriminationInput, TemperatureRun, DisturbanceInput, SessionInput,
                      SpecIssue, SpecCheckResult, TestResult, Verdict, TestName,
                      TEST_SOURCE_FIELD)