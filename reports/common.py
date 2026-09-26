"""Shared prep logic used by both the PDF and DOCX generators.

Keeping this here means the two output formats can never silently drift
apart on numbers, verdict colours, or the rounding-trap detection.
"""
from datetime import datetime
from typing import Any

from .i18n import labels, test_names
from .qr import qr_data_uri

VERDICT_COLOURS = {"PASS": "#067647", "FAIL": "#b42318", "MARGINAL": "#b54708"}


def format_dt(value) -> str:
    """'2026-09-26T08:42:59+00:00' -> '26 Sep 2026, 08:42 UTC'. Passes through
    anything it can't parse (e.g. already-human strings from context_example.py,
    or None) unchanged."""
    if not value:
        return "-"
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y, %H:%M") + (" UTC" if dt.utcoffset() is not None
                                                  and dt.utcoffset().total_seconds() == 0 else "")
    except (ValueError, TypeError):
        return str(value)


def test_display_name(test_key: str, lang: str) -> str:
    """Readable test name, e.g. 'zero_setting' -> 'Zero-setting accuracy'."""
    names = test_names(lang)
    if test_key in names:
        return names[test_key]
    return (test_key or "").replace("_", " ").capitalize()


def result_row(r: dict, lang: str = "en") -> dict:
    """Normalise one engine result for display.

    The real engine (P1's TestResult, see the Day-1 contract) puts the naive
    comparison in FLAT fields: naive_error / naive_result, directly on the
    result dict. Support that as the primary shape; also accept a nested
    {"naive": {"error":..., "result":...}} dict so context_example.py's
    fabricated data keeps working without edits.
    """
    nested = r.get("naive") or {}
    naive_error = r.get("naive_error", nested.get("error"))
    naive_result = r.get("naive_result", nested.get("result"))
    is_trap = naive_result is not None and naive_result != r.get("result")
    return {
        "test": r.get("test"),
        "test_name": test_display_name(r.get("test"), lang),
        "label": r.get("label"),
        "load": r.get("load"),
        "error": r.get("error"),
        "mpe": r.get("mpe"),
        "utilisation": r.get("utilisation"),
        "result": r.get("result"),
        "marginal": bool(r.get("marginal")),
        "clause": r.get("clause"),
        "explanation": r.get("explanation"),
        "naive_error": naive_error,
        "naive_result": naive_result,
        "is_rounding_trap": is_trap,
        "colour": VERDICT_COLOURS.get(r.get("result"), "#444"),
    }

def build_view(context: dict) -> dict:
    """Turn the raw report context into everything a template needs, precomputed."""
    lang = context.get("lang") or "en"
    L = labels(lang)
    results = [result_row(r, lang) for r in (context.get("results") or [])]
    trap_rows = [r for r in results if r["is_rounding_trap"]]
    marginal_rows = [r for r in results if r["marginal"]]
    report = dict(context.get("report") or {})
    report["approved_at"] = format_dt(report.get("approved_at"))
    verify_url = report.get("verify_url")
    overall = context.get("verdict", {}).get("overall") or report.get("overall_verdict")

    session = dict(context.get("session") or {})
    session["tested_at"] = format_dt(session.get("tested_at"))

    return {
        "lang": lang,
        "L": L,
        "report": report,
        "approved_by": context.get("approved_by"),
        "tester": context.get("tester"),
        "lab": context.get("lab"),
        "manufacturer": context.get("manufacturer"),
        "instrument": context.get("instrument"),
        "session": session,
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
