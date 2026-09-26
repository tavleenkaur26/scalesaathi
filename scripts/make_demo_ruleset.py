"""Creates engine/rulesets/oiml_r76_v2_demo.json from the verified v1 ruleset.
Run from the repo root: python scripts/make_demo_ruleset.py

THIS IS A HYPOTHETICAL REVISION FOR THE DEMO, NOT A REAL OIML CHANGE.
It tightens one limit (class III, loads up to 500e: MPE 0.5e -> 0.4e) so the
rule-version impact analysis has something to show: which past approvals would
be affected if OIML ever changed that limit.
"""
import copy
import json
from pathlib import Path

RULESETS = Path(__file__).resolve().parent.parent / "engine" / "rulesets"


def build_demo(v1: dict) -> dict:
    v2 = copy.deepcopy(v1)
    v2["version"] = "2.0.0-demo"
    v2["edition"] = "hypothetical-demo"
    v2["demo"] = True
    v2["description"] = ("HYPOTHETICAL DEMO REVISION, not a real OIML edition. Identical to v1 except: "
                         "class III MPE for loads up to 500e tightened from 0.5e to 0.4e.")
    v2["classes"]["III"]["mpe"]["bands"][0]["mpe_e"] = 0.4
    return v2


if __name__ == "__main__":
    v1 = json.loads((RULESETS / "oiml_r76_v1.json").read_text())
    out = RULESETS / "oiml_r76_v2_demo.json"
    out.write_text(json.dumps(build_demo(v1), indent=2, ensure_ascii=False))
    print(f"Wrote {out}")