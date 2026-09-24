from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from engine import InstrumentSpec
from backend.auth import get_current_user, require_role
from backend.constants import ADMIN, TESTER
from backend.db import get_db
from backend.models import Instrument, Manufacturer, User
from backend.services import analytics, engine_adapter as ea
from backend.services.sessions import instrument_summary
from pydantic import BaseModel

router = APIRouter(tags=["catalog"])


class ManufacturerIn(BaseModel):
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class InstrumentIn(InstrumentSpec):
    manufacturer_id: int
    model: str
    serial_no: str
    instrument_type: Optional[str] = None


def _m(m: Manufacturer) -> dict:
    return {"id": m.id, "name": m.name, "address": m.address, "contact_person": m.contact_person,
            "phone": m.phone, "email": m.email}


@router.post("/manufacturers", status_code=201)
def create_manufacturer(body: ManufacturerIn, db: Session = Depends(get_db),
                        user: User = Depends(require_role(TESTER, ADMIN))):
    if db.query(Manufacturer).filter(Manufacturer.name.ilike(body.name.strip())).first():
        raise HTTPException(409, "A manufacturer with this name already exists")
    m = Manufacturer(**{**body.model_dump(), "name": body.name.strip()})
    db.add(m)
    db.commit()
    return _m(m)


@router.get("/manufacturers")
def list_manufacturers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [_m(m) for m in db.query(Manufacturer).order_by(Manufacturer.name).all()]


@router.post("/instruments/validate-spec")
def validate_spec(spec: InstrumentSpec, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    """Always 200. Errors/warnings come back in `issues`, each with the form `field` and the clause."""
    return ea.spec_check(spec, ea.get_ruleset(db))


@router.post("/instruments", status_code=201)
def create_instrument(body: InstrumentIn, db: Session = Depends(get_db),
                      user: User = Depends(require_role(TESTER, ADMIN))):
    if db.get(Manufacturer, body.manufacturer_id) is None:
        raise HTTPException(404, "Manufacturer not found")
    spec = InstrumentSpec(**body.model_dump(include=set(InstrumentSpec.model_fields)))
    check = ea.spec_check(spec, ea.get_ruleset(db))
    if any(i["severity"] == "error" for i in check["issues"]):
        raise HTTPException(422, {"message": "Specification does not fit the declared class", **check})
    if db.query(Instrument).filter_by(manufacturer_id=body.manufacturer_id, model=body.model,
                                      serial_no=body.serial_no).first():
        raise HTTPException(409, "This instrument (manufacturer, model, serial) is already registered")
    inst = Instrument(**body.model_dump(), created_by_id=user.id)
    db.add(inst)
    db.commit()
    return {**instrument_summary(inst), "spec_check": check}


@router.get("/instruments")
def list_instruments(search: Optional[str] = None, manufacturer_id: Optional[int] = None,
                     db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Instrument).join(Manufacturer)
    if manufacturer_id:
        q = q.filter(Instrument.manufacturer_id == manufacturer_id)
    if search:
        like = f"%{search}%"
        q = q.filter(Instrument.model.ilike(like) | Instrument.serial_no.ilike(like) | Manufacturer.name.ilike(like))
    return [instrument_summary(i) for i in q.order_by(Instrument.id.desc()).all()]


def _get(db, instrument_id) -> Instrument:
    inst = db.get(Instrument, instrument_id)
    if inst is None:
        raise HTTPException(404, "Instrument not found")
    return inst


@router.get("/instruments/{instrument_id}")
def get_instrument(instrument_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inst = _get(db, instrument_id)
    return {**instrument_summary(inst), "history": analytics.instrument_history(db, instrument_id)}


@router.get("/instruments/{instrument_id}/test-plan")
def get_test_plan(instrument_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return ea.make_test_plan(_get(db, instrument_id), ea.get_ruleset(db))
