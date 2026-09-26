"""Shared prep logic used by both the PDF and DOCX generators.

Keeping this here means the two output formats can never silently drift
apart on numbers, verdict colours, or the rounding-trap detection.
"""
from typing import Any

from .i18n import labels
from .qr import qr_data_uri

VERDICT_COLOURS = {"PASS": "#067647", "FAIL": "#b42318", "MARGINAL": "#b54708"}


def result_row(r: dict) -> dict:
    """Normalise one engine result (see the P1 contract) for display."""
    naive = r.get("naive") or {}
    is_trap = bool(naive) and naive.get("result") not in (None, r.get("result"))
    return {
        "test": r.get("test"),
        "load": r.get("load"),
        "error": r.get("error"),
        "mpe": r.get("mpe"),
        "utilisation": r.get("utilisation"),
        "result": r.get("result"),
        "marginal": bool(r.get("marginal")),
        "clause": r.get("clause"),
        "explanation": r.get("explanation"),
        "naive_error": naive.get("error"),
        "naive_result": naive.get("result"),
        "is_rounding_trap": is_trap,
        "colour": VERDICT_COLOURS.get(r.get("result"), "#444"),
    }


def build_view(context: dict) -> dict:
    """Turn the raw report context into everything a template needs, precomputed."""
    lang = context.get("lang") or "en"
    L = labels(lang)
    results = [result_row(r) for r in (context.get("results") or [])]
    trap_rows = [r for r in results if r["is_rounding_trap"]]
    marginal_rows = [r for r in results if r["marginal"]]
    report = context.get("report") or {}
    verify_url = report.get("verify_url")
    overall = context.get("verdict", {}).get("overall") or report.get("overall_verdict")

    return {
        "lang": lang,
        "L": L,
        "report": report,
        "approved_by": context.get("approved_by"),
        "tester": context.get("tester"),
        "lab": context.get("lab"),
        "manufacturer": context.get("manufacturer"),
        "instrument": context.get("instrument"),
        "session": context.get("session"),
        "verdict": context.get("verdict") or {},
        "overall": overall,
        "overall_colour": VERDICT_COLOURS.get(overall, "#444"),
        "results": results,
        "trap_rows": trap_rows,
        "marginal_rows": marginal_rows,
        "attachments": context.get("attachments") or [],
        "annexes": context.get("annexes") or [],
        "qr_data_uri": qr_data_uri(verify_url) if verify_url else None,
        "verify_url": verify_url,
    }
