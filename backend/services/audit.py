"""Automatic audit trail: every insert/update/delete is logged inside the same transaction.
The acting user comes from db.info["user"], which auth.get_current_user sets per request."""
from datetime import datetime

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from backend.models import AuditLog, utcnow

SKIP = {"AuditLog"}
REDACT = {"password_hash"}


def _short(v):
    if isinstance(v, (bytes, bytearray)):
        return f"<{len(v)} bytes>"
    if isinstance(v, (dict, list)):
        return "<json>"
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)[:80]


@event.listens_for(Session, "after_flush")
def _audit(session: Session, _ctx):
    user = session.info.get("user")
    uid, uname = (user.id, user.full_name) if user is not None else (None, "system")
    rows = []
    for action, objs in (("insert", list(session.new)), ("update", list(session.dirty)),
                         ("delete", list(session.deleted))):
        for obj in objs:
            name = type(obj).__name__
            if name in SKIP:
                continue
            detail = {}
            if action == "update":
                for attr in inspect(obj).attrs:
                    h = attr.history
                    if h.has_changes() and h.added:
                        old = h.deleted[0] if h.deleted else None
                        new = h.added[0]
                        if attr.key in REDACT:
                            old, new = "***", "***"
                        detail[attr.key] = [_short(old), _short(new)]
                if not detail:
                    continue
            rows.append({"at": utcnow(), "user_id": uid, "user_name": uname, "action": action,
                         "entity": name, "entity_id": getattr(obj, "id", None),
                         "description": None, "detail": detail or None})
    if rows:
        session.connection().execute(AuditLog.__table__.insert(), rows)


def log_event(db: Session, user, action: str, entity: str, entity_id, description: str):
    """Explicit business event (shown in the dashboard's recent-activity feed)."""
    db.add(AuditLog(user_id=user.id if user else None, user_name=user.full_name if user else "system",
                    action=action, entity=entity, entity_id=entity_id, description=description))
