"""Error calculations.

Why the changeover-point method exists (R 76-1 A.4.4.3):
A digital display rounds to the nearest interval d, so "indication - load"
can be off by up to d/2. Near small loads that is as large as the whole MPE.
R 76 removes the rounding by adding small weights (typically 0.1 d each) until
the display steps up by one interval. The load at that changeover gives the
indication before rounding:

    P = I + d/2 - delta_L        (indication before rounding)
    E = P - L = I + d/2 - delta_L - L

If a zero reference error E0 is known, the corrected error is Ec = E - E0.
"""
from typing import Optional
from .schemas import Reading

ROUND = 6


def naive_error(r: Reading) -> float:
    return round(r.indication - r.load, ROUND)


def changeover_error(r: Reading, d: float) -> Optional[float]:
    if r.delta_l is None:
        return None
    return round(r.indication + d / 2 - r.delta_l - r.load, ROUND)


def corrected_error(r: Reading, d: float, e0: Optional[float]) -> Optional[float]:
    err = changeover_error(r, d)
    if err is None:
        return None
    return round(err - e0, ROUND) if e0 is not None else err


def round_to_interval(x: float, e: float) -> float:
    """Rounds a load to the nearest multiple of e (test weights are set in whole intervals)."""
    return round(round(x / e) * e, ROUND)
