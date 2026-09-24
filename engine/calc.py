"""Error calculations.

Why the changeover-point method exists (R 76-1 3.5.3.2 and A.4.4.3):
A digital display rounds to the nearest interval, so "indication - load" can be
off by up to half an interval. Near small loads that is as large as the whole MPE.
R 76 removes the rounding by adding small weights (about 1/10 e each) until the
display increases unambiguously by one interval. The load at that changeover gives
the indication before rounding (R 76-1 A.4.4.3):

    P  = I + e/2 - delta_L        (indication prior to rounding)
    E  = P - L = I + e/2 - delta_L - L
    Ec = E - E0 <= mpe            (E0 = error at or near zero, e.g. at 10e)
"""
from typing import Optional
from .schemas import Reading

ROUND = 6


def naive_error(r: Reading) -> float:
    return round(r.indication - r.load, ROUND)


def changeover_error(r: Reading, e: float) -> Optional[float]:
    if r.delta_l is None:
        return None
    return round(r.indication + e / 2 - r.delta_l - r.load, ROUND)


def corrected_error(r: Reading, e: float, e0: Optional[float]) -> Optional[float]:
    err = changeover_error(r, e)
    if err is None:
        return None
    return round(err - e0, ROUND) if e0 is not None else err


def round_to_interval(x: float, e: float) -> float:
    """Rounds a load to the nearest multiple of e (test weights are set in whole intervals)."""
    return round(round(x / e) * e, ROUND)