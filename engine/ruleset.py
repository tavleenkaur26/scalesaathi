"""Loads a versioned R 76 ruleset and answers lookups (MPE, class bands, rules).

The engine never hardcodes a metrological value. Everything comes from the
ruleset JSON, so a revised OIML edition is a new file, not a code change.
"""
import json
from pathlib import Path

EPS = 1e-9
RULESET_DIR = Path(__file__).parent / "rulesets"


class Ruleset:
    def __init__(self, data: dict):
        self.data = data
        self.version = data["version"]
        self.id = data["id"]

    # ---------- generic accessors ----------
    def rule(self, name: str):
        """Returns (value, clause) for a named rule."""
        r = self.data["rules"][name]
        return r["value"], r["clause"]

    def advisory(self, name: str):
        return self.data["advisory"][name]["value"]

    def class_data(self, accuracy_class: str) -> dict:
        try:
            return self.data["classes"][accuracy_class]
        except KeyError:
            raise ValueError(f"Unknown accuracy class: {accuracy_class}")

    # ---------- MPE lookup ----------
    def mpe(self, accuracy_class: str, load: float, e: float) -> dict:
        """MPE for a load, expressed in the load's unit.

        m = load / e (the load counted in verification scale intervals).
        Returns the MPE, the band it fell in, and the clause.
        """
        mpe_data = self.class_data(accuracy_class)["mpe"]
        m = abs(load) / e
        lower = 0
        for band in mpe_data["bands"]:
            upper = band["m_max"]
            if upper is None or m <= upper + EPS:
                return {
                    "mpe": round(band["mpe_e"] * e, 9),
                    "mpe_e": band["mpe_e"],
                    "m": round(m, 6),
                    "band": (lower, upper),
                    "clause": mpe_data["clause"],
                }
            lower = upper
        # load above the last band's upper limit: use the last band
        last = mpe_data["bands"][-1]
        return {
            "mpe": round(last["mpe_e"] * e, 9),
            "mpe_e": last["mpe_e"],
            "m": round(m, 6),
            "band": (lower, last["m_max"]),
            "clause": mpe_data["clause"],
        }
    def repeatability_count(self, max_capacity: float) -> int:
        """Weighings per repeatability series for type approval (R76-1 A.4.10)."""
        v, _ = self.rule("repeatability_weighings")
        ta = v["type_approval"]
        return ta["weighings_below"] if max_capacity < ta["max_below_g"] else ta["weighings_otherwise"]
    
    def band_boundaries(self, accuracy_class: str) -> list:
        """Load points (in e) where the MPE changes. These are where scales most often flip."""
        bands = self.class_data(accuracy_class)["mpe"]["bands"]
        return [b["m_max"] for b in bands[:-1] if b["m_max"] is not None]

    def unverified_items(self) -> list:
        """Everything still marked verified=false. Show this list before any real use."""
        items = []
        for cls, cdata in self.data["classes"].items():
            for part in ("classification", "mpe"):
                if not cdata[part].get("verified"):
                    items.append(f"Class {cls} {part} ({cdata[part]['clause']})")
        for name, r in self.data["rules"].items():
            if not r.get("verified"):
                items.append(f"{name} ({r['clause']})")
        return items


def load_ruleset(version: str = "v1") -> Ruleset:
    path = RULESET_DIR / f"oiml_r76_{version}.json"
    with open(path) as f:
        return Ruleset(json.load(f))


def load_ruleset_from_dict(data: dict) -> Ruleset:
    """Used when an admin uploads a new ruleset version."""
    required = {"id", "version", "classes", "rules", "advisory"}
    missing = required - set(data)
    if missing:
        raise ValueError(f"Ruleset missing keys: {sorted(missing)}")
    return Ruleset(data)
