"""Base data (lab, demo users, ruleset v1) and the demo sample data. Everything is idempotent."""
import json
from datetime import timedelta
from pathlib import Path

import engine
from engine.seed_loader import load_seeds
from sqlalchemy.orm import Session

from backend.auth import hash_password
from backend.config import settings
from backend.constants import (ADMIN, APPROVED, DRAFT, EDITABLE, RETURNED, REVIEWER, SUBMITTED, TESTER,
                               UNDER_REVIEW)
from backend.models import (Instrument, Lab, Manufacturer, Observation, RulesetVersion, TestSession,
                            User, utcnow)
from backend.services import workflow
from backend.services.sessions import run_evaluation

DEMO_USERS = [
    ("admin@scalesaathi.demo", ADMIN, "Dr. Meera Kapoor", "Laboratory Director"),
    ("tester@scalesaathi.demo", TESTER, "Rahul Verma", "Testing Officer"),
    ("reviewer@scalesaathi.demo", REVIEWER, "Anita Sharma", "Senior Reviewing Officer"),
]

# seed id -> (final status, days ago, serial suffix)
PLAN = {
    "01_normal_pass": (APPROVED, 9), "02_clear_fail": (APPROVED, 8), "03_rounding_trap": (APPROVED, 6),
    "04_reverse_rounding_trap": (APPROVED, 5), "05_marginal_pass": (APPROVED, 3),
    "06_band_boundary": (SUBMITTED, 2), "07_wrong_class_spec": (RETURNED, 2),
    "08_eccentricity_fail": (UNDER_REVIEW, 1), "09_in_progress": (DRAFT, 0),
}
RETEST = ("02_clear_fail", "02b_clear_fail_retest", APPROVED, 4)   # same model failing again


def ensure_base_data(db: Session) -> None:
    lab = db.query(Lab).first()
    if lab is None:
        lab = Lab(name="ScaleSaathi Demo Testing Laboratory", address="New Delhi, India (demo data)",
                  accreditation_no="DEMO-0001",
                  default_conditions_text="Tests performed in a draught-free room after a 2-hour warm-up.")
        db.add(lab)
        db.flush()
    for email, role, name, desig in DEMO_USERS:
        if not db.query(User).filter_by(email=email).first():
            db.add(User(email=email, role=role, full_name=name, designation=desig, lab_id=lab.id,
                        password_hash=hash_password(settings.demo_password)))
    if db.query(RulesetVersion).count() == 0:
        path = Path(engine.__file__).parent / "rulesets" / "oiml_r76_v1.json"
        data = json.loads(path.read_text())
        db.add(RulesetVersion(version=data["version"], ruleset_id=data["id"], data=data, is_active=True))
    db.flush()


def _instrument(db, seed, serial, spec) -> Instrument:
    meta = seed["meta"]
    m = db.query(Manufacturer).filter_by(name=meta["manufacturer"]).first()
    if m is None:
        m = Manufacturer(name=meta["manufacturer"], address="Industrial Area, India (demo)",
                         contact_person="Sales Desk", phone="+91-00000-00000",
                         email="contact@" + meta["manufacturer"].split()[0].lower() + ".example")
        db.add(m)
        db.flush()
    inst = db.query(Instrument).filter_by(manufacturer_id=m.id, model=meta["model"], serial_no=serial).first()
    if inst is None:
        inst = Instrument(manufacturer_id=m.id, model=meta["model"], serial_no=serial,
                          instrument_type=meta.get("instrument_type"), **spec.model_dump())
        db.add(inst)
        db.flush()
    return inst


def _observations(si) -> dict:
    d = si.model_dump(mode="json", exclude_unset=True)
    d.pop("spec", None)
    return d


def _make_session(db, seed, seed_key, serial, status, days_ago, tester, reviewer) -> None:
    if db.query(TestSession).filter_by(seed_key=seed_key).first():
        return
    si = seed["session"]
    inst = _instrument(db, seed, serial, si.spec)
    when = (utcnow() - timedelta(days=days_ago)).replace(hour=10, minute=30)
    s = TestSession(seed_key=seed_key, instrument_id=inst.id, tester_id=tester.id, tested_at=when,
                    location="Demo Lab, Bay 2", temperature_c=23.5, humidity_pct=48, pressure_hpa=1008,
                    status=DRAFT)
    db.add(s)
    for test, payload in _observations(si).items():
        s.observations.append(Observation(test=test, payload=payload))
    db.flush()
    if status == DRAFT:
        return
    run_evaluation(db, s)
    s.status, s.submitted_at = SUBMITTED, when + timedelta(hours=3)
    if status == APPROVED:
        workflow.approve(db, reviewer, s, approved_at=when + timedelta(hours=6))
    elif status == UNDER_REVIEW:
        s.status, s.reviewer_id = UNDER_REVIEW, reviewer.id
    elif status == RETURNED:
        s.status, s.reviewer_id = RETURNED, reviewer.id
        s.review_comment = "Declared class does not fit the scale interval. Correct the specification and re-test."
    db.flush()


def load_sample_data(db: Session) -> None:
    ensure_base_data(db)
    tester = db.query(User).filter_by(email="tester@scalesaathi.demo").one()
    reviewer = db.query(User).filter_by(email="reviewer@scalesaathi.demo").one()
    seeds = {s["id"]: s for s in load_seeds()}
    for sid, (status, days) in PLAN.items():
        if sid in seeds:
            _make_session(db, seeds[sid], sid, f"SN-{sid[:2]}-001", status, days, tester, reviewer)
    base, key, status, days = RETEST
    if base in seeds:
        _make_session(db, seeds[base], key, "SN-02-002", status, days, tester, reviewer)


def ensure_sample_draft(db: Session, user: User) -> TestSession:
    """A ready-to-evaluate Draft for this user, filled with the rounding-trap seed."""
    load_sample_data(db)
    prefix = f"sample-draft-{user.id}-"
    mine = db.query(TestSession).filter(TestSession.seed_key.like(prefix + "%")).order_by(TestSession.id).all()
    if mine and mine[-1].status in EDITABLE:
        return mine[-1]
    seed = next(s for s in load_seeds() if s["id"] == "03_rounding_trap")
    inst = _instrument(db, seed, "SN-03-001", seed["session"].spec)
    s = TestSession(seed_key=f"{prefix}{len(mine) + 1}", instrument_id=inst.id, tester_id=user.id,
                    location="Demo Lab, Bay 2", temperature_c=23.5, humidity_pct=48, pressure_hpa=1008)
    db.add(s)
    for test, payload in _observations(seed["session"]).items():
        s.observations.append(Observation(test=test, payload=payload))
    db.flush()
    return s
