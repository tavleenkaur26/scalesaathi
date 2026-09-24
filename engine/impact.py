"""Rule-version impact analysis: when a new ruleset is uploaded, re-evaluate past
sessions and report which verdicts would change. Answers the PS requirement to
'support future updates whenever OIML recommendations are revised'."""
from .ruleset import Ruleset
from .schemas import SessionInput
from .verdict import evaluate_session


def ruleset_impact(sessions: dict[str, SessionInput], old: Ruleset, new: Ruleset) -> dict:
    changes = []
    for session_id, session in sessions.items():
        before = evaluate_session(session, old)
        after = evaluate_session(session, new)
        test_changes = [
            {"test": a.test, "label": a.label, "load": a.load,
             "before": b.result, "after": a.result, "mpe_before": b.mpe, "mpe_after": a.mpe}
            for b, a in zip(before.results, after.results) if b.result != a.result
        ]
        if before.overall != after.overall or test_changes:
            changes.append({"session_id": session_id,
                            "overall_before": before.overall, "overall_after": after.overall,
                            "test_changes": test_changes})
    return {
        "old_version": old.version,
        "new_version": new.version,
        "sessions_checked": len(sessions),
        "sessions_affected": len(changes),
        "verdicts_flipped": sum(c["overall_before"] != c["overall_after"] for c in changes),
        "changes": changes,
    }
