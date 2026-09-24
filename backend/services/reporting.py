"""Report hash, public verification, and the context dict handed to P4's generators."""
import base64
import hashlib
import html
import json
from typing import Optional

from sqlalchemy.orm import Session

from backend.config import settings
from backend.constants import APPROVED
from backend.models import Attachment, Lab, Report, TestSession, User
from backend.services.sessions import instrument_summary, iso, observations_of


# ---------------------------------------------------------------- hashing
def canonical_record(s: TestSession, approver_id: int, approved_at) -> dict:
    """Everything that must not change after approval. Nothing mutable (updated_at etc.)."""
    return {
        "session_id": s.id,
        "instrument": instrument_summary(s.instrument),
        "tester_id": s.tester_id,
        "tested_at": iso(s.tested_at),
        "location": s.location,
        "conditions": {"temperature_c": s.temperature_c, "humidity_pct": s.humidity_pct,
                       "pressure_hpa": s.pressure_hpa},
        "ruleset_version": s.ruleset_version,
        "observations": observations_of(s),
        "verdict": s.verdict_json,
        "approved_by_id": approver_id,
        "approved_at": iso(approved_at),
    }


def compute_hash(s: TestSession, approver_id: int, approved_at) -> str:
    blob = json.dumps(canonical_record(s, approver_id, approved_at), sort_keys=True,
                      separators=(",", ":"), ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def verify_url(h: str) -> str:
    return f"{settings.public_base_url.rstrip('/')}/verify/{h}"


# ---------------------------------------------------------------- verification
def verify(db: Session, h: str) -> dict:
    rep = db.query(Report).filter_by(hash=h.strip().lower()).first()
    if rep is None:
        return {"status": "not_found"}
    s = rep.session
    intact = (s.status == APPROVED
              and compute_hash(s, rep.approved_by_id, rep.approved_at) == rep.hash)
    lab = s.tester.lab
    return {
        "status": "genuine" if intact else "modified",
        "report_no": rep.report_no, "instrument_model": s.instrument.model,
        "serial_no": s.instrument.serial_no, "manufacturer": s.instrument.manufacturer.name,
        "accuracy_class": s.instrument.accuracy_class, "verdict": rep.overall_verdict,
        "approved_by": rep.approved_by.full_name, "approved_at": iso(rep.approved_at),
        "lab_name": lab.name if lab else None,
    }


def verify_html(d: dict) -> str:
    """Fallback page. P4's verify.html template can replace this (see routes/reports.py)."""
    e = lambda v: html.escape(str(v if v is not None else "-"))
    if d["status"] == "not_found":
        head, colour, body = "Report not found", "#b42318", "<p>No report matches this code.</p>"
    else:
        ok = d["status"] == "genuine"
        head = "Genuine, unchanged" if ok else "WARNING: record modified after approval"
        colour = "#067647" if ok else "#b42318"
        rows = [("Report no.", d["report_no"]), ("Instrument", f"{d['manufacturer']} {d['instrument_model']}"),
                ("Serial no.", d["serial_no"]), ("Class", d["accuracy_class"]), ("Verdict", d["verdict"]),
                ("Approved by", d["approved_by"]), ("Approved on", d["approved_at"]), ("Lab", d["lab_name"])]
        body = "<table>" + "".join(f"<tr><th>{e(k)}</th><td>{e(v)}</td></tr>" for k, v in rows) + "</table>"
    return (f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
            f"<title>ScaleSaathi verification</title><body style='font-family:sans-serif;max-width:560px;"
            f"margin:2rem auto;padding:0 1rem'><h2 style='color:{colour}'>{e(head)}</h2>{body}"
            f"<style>th{{text-align:left;padding:4px 12px 4px 0;color:#555}}</style></body>")


# ---------------------------------------------------------------- report context (for P4)
def _uri(content_type: Optional[str], data: Optional[bytes]) -> Optional[str]:
    if not data:
        return None
    return f"data:{content_type or 'application/octet-stream'};base64,{base64.b64encode(data).decode()}"


def get_report_context(db: Session, s: TestSession, lang: str = "en", with_bytes: bool = True) -> dict:
    rep = db.query(Report).filter_by(session_id=s.id).first()
    i, m, tester = s.instrument, s.instrument.manufacturer, s.tester
    lab: Optional[Lab] = tester.lab or db.query(Lab).first()
    approver: Optional[User] = rep.approved_by if rep else None
    atts = db.query(Attachment).filter_by(session_id=s.id).order_by(Attachment.id).all()
    photos = [a for a in atts if a.kind == "photo" and a.include_in_report]
    verdict = s.verdict_json or {}
    return {
        "lang": lang,
        "report": {"report_no": rep.report_no if rep else None, "hash": rep.hash if rep else None,
                   "verify_url": verify_url(rep.hash) if rep else None,
                   "approved_at": iso(rep.approved_at) if rep else None,
                   "overall_verdict": s.verdict_overall, "ruleset_version": s.ruleset_version},
        "approved_by": {"full_name": approver.full_name, "designation": approver.designation,
                        "signature_data_uri": _uri(approver.signature_content_type, approver.signature)}
                       if approver else None,
        "tester": {"full_name": tester.full_name, "designation": tester.designation},
        "lab": {"name": lab.name, "address": lab.address, "accreditation_no": lab.accreditation_no,
                "logo_data_uri": _uri(lab.logo_content_type, lab.logo),
                "default_conditions_text": lab.default_conditions_text} if lab else None,
        "manufacturer": {"name": m.name, "address": m.address, "contact_person": m.contact_person,
                         "phone": m.phone, "email": m.email},
        "instrument": {"model": i.model, "serial_no": i.serial_no, "max_capacity": i.max_capacity,
                       "min_capacity": i.min_capacity, "e": i.e, "d": i.d if i.d is not None else i.e,
                       "accuracy_class": i.accuracy_class, "max_tare": i.max_tare,
                       "support_points": i.support_points, "temp_min": i.temp_min, "temp_max": i.temp_max},
        "session": {"id": s.id, "tested_at": iso(s.tested_at), "location": s.location,
                    "conditions": {"temperature_c": s.temperature_c, "humidity_pct": s.humidity_pct,
                                   "pressure_hpa": s.pressure_hpa}},
        "verdict": {"overall": verdict.get("overall"), "marginal_results": verdict.get("marginal_results", 0),
                    "rounding_traps": verdict.get("rounding_traps", 0),
                    "failed_tests": verdict.get("failed_tests", []), "warnings": verdict.get("warnings", [])},
        "results": verdict.get("results", []),
        "observations": observations_of(s),
        "attachments": [{"filename": a.filename, "caption": a.caption, "content_type": a.content_type,
                         **({"data": a.data} if with_bytes else {}), "data_uri": _uri(a.content_type, a.data)}
                        for a in photos],
        "annexes": [{"filename": a.filename, "kind": a.kind} for a in atts if a not in photos],
    }
