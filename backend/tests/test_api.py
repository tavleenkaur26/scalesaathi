"""End-to-end API tests. Run from the repo root:  python -m pytest backend/tests -q"""
import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["SEED_SAMPLE_ON_STARTUP"] = "true"

import pytest
from fastapi.testclient import TestClient

from backend.db import SessionLocal
from backend.main import app
from backend.models import AuditLog, Report, TestSession
from engine.seed_loader import load_seeds

PW = "Demo@1234"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(client, who):
    r = client.post("/auth/login", json={"email": f"{who}@scalesaathi.demo", "password": PW})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


@pytest.fixture(scope="module")
def H(client):
    return {w: login(client, w) for w in ("tester", "reviewer", "admin")}


def seed_obs(seed_id):
    s = next(x for x in load_seeds() if x["id"] == seed_id)["session"]
    d = s.model_dump(mode="json", exclude_unset=True)
    spec = d.pop("spec")
    return spec, d


def new_session(client, H, seed_id="03_rounding_trap", serial="T-1"):
    spec, obs = seed_obs(seed_id)
    m = client.post("/manufacturers", json={"name": f"Mfr {serial}"}, headers=H["tester"]).json()
    r = client.post("/instruments", json={**spec, "manufacturer_id": m["id"], "model": "M1", "serial_no": serial},
                    headers=H["tester"])
    assert r.status_code == 201, r.text
    s = client.post("/sessions", json={"instrument_id": r.json()["id"], "location": "Lab",
                                       "conditions": {"temperature_c": 22}}, headers=H["tester"]).json()
    for test, payload in obs.items():
        assert client.post(f"/sessions/{s['id']}/observations", json={"test": test, "payload": payload},
                           headers=H["tester"]).status_code == 200
    return s["id"]


def test_auth_and_roles(client, H):
    assert client.post("/auth/login", json={"email": "tester@scalesaathi.demo", "password": "x"}).status_code == 401
    assert client.get("/sessions").status_code == 401
    assert client.post("/rulesets", json={}, headers=H["tester"]).status_code == 403
    assert client.post("/sessions/1/approve", headers=H["tester"]).status_code == 403


def test_validate_spec_and_instrument_rejection(client, H):
    spec, _ = seed_obs("07_wrong_class_spec")
    r = client.post("/instruments/validate-spec", json=spec, headers=H["tester"])
    assert r.status_code == 200 and not r.json()["valid"] and r.json()["issues"][0]["clause"].startswith("R76")
    m = client.get("/manufacturers", headers=H["tester"]).json()[0]
    r = client.post("/instruments", json={**spec, "manufacturer_id": m["id"], "model": "Bad", "serial_no": "B1"},
                    headers=H["tester"])
    assert r.status_code == 422 and r.json()["detail"]["issues"]


def test_test_plan(client, H):
    inst = client.get("/instruments", headers=H["tester"]).json()[0]
    plan = client.get(f"/instruments/{inst['id']}/test-plan", headers=H["tester"]).json()
    assert plan["weighing"]["points"] and plan["eccentricity"]["positions"]


def test_invalid_readings_rejected(client, H):
    sid = new_session(client, H, serial="T-bad")
    bad = [{"load": 5000, "indication": 5003, "delta_l": 2.5}]      # 5003 is not a multiple of d = 5
    r = client.post(f"/sessions/{sid}/observations", json={"test": "weighing", "payload": bad}, headers=H["tester"])
    assert r.status_code == 422
    r = client.post(f"/sessions/{sid}/observations", json={"test": "nonsense", "payload": []}, headers=H["tester"])
    assert r.status_code == 422


def test_full_flow_rounding_trap_and_verification(client, H):
    sid = new_session(client, H, serial="T-flow")
    assert client.post(f"/sessions/{sid}/submit", headers=H["tester"]).status_code == 409   # not evaluated yet
    v = client.post(f"/sessions/{sid}/evaluate", headers=H["tester"]).json()
    assert v["overall"] == "FAIL" and v["rounding_traps"] == 1
    trap = [r for r in v["results"] if r["naive_result"] != r["result"]][0]
    assert trap["naive_result"] == "PASS" and trap["result"] == "FAIL"

    assert client.post(f"/sessions/{sid}/submit", headers=H["tester"]).json()["status"] == "Submitted"
    # locked after submit
    assert client.post(f"/sessions/{sid}/evaluate", headers=H["tester"]).status_code == 409
    # maker-checker: tester cannot approve; admin who is not the tester can
    assert client.post(f"/sessions/{sid}/approve", headers=H["tester"]).status_code == 403
    assert client.post(f"/sessions/{sid}/start-review", headers=H["reviewer"]).json()["status"] == "Under Review"
    d = client.post(f"/sessions/{sid}/approve", headers=H["reviewer"]).json()
    assert d["status"] == "Approved" and d["report_no"].startswith("SS-")

    ctx = client.get(f"/reports/{sid}/context", headers=H["tester"]).json()
    assert ctx["report"]["verify_url"].endswith(ctx["report"]["hash"]) and ctx["results"] and ctx["lab"]

    h = ctx["report"]["hash"]
    assert client.get(f"/verify/{h}?format=json").json()["status"] == "genuine"     # public, no auth
    assert "Genuine" in client.get(f"/verify/{h}").text
    assert client.get("/verify/deadbeef?format=json").json()["status"] == "not_found"

    with SessionLocal() as db:                                                     # tamper with the record
        db.query(TestSession).filter_by(id=sid).update({"location": "Elsewhere"})
        db.commit()
    assert client.get(f"/verify/{h}?format=json").json()["status"] == "modified"


def test_return_needs_comment_and_reedit(client, H):
    sid = new_session(client, H, "01_normal_pass", serial="T-ret")
    client.post(f"/sessions/{sid}/evaluate", headers=H["tester"])
    client.post(f"/sessions/{sid}/submit", headers=H["tester"])
    assert client.post(f"/sessions/{sid}/return", json={}, headers=H["reviewer"]).status_code == 422
    r = client.post(f"/sessions/{sid}/return", json={"comment": "Recheck eccentricity"}, headers=H["reviewer"])
    assert r.json()["status"] == "Returned" and r.json()["review_comment"] == "Recheck eccentricity"
    assert client.post(f"/sessions/{sid}/evaluate", headers=H["tester"]).status_code == 200   # editable again


def test_attachments(client, H):
    sid = new_session(client, H, "01_normal_pass", serial="T-att")
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 32
    r = client.post("/attachments", data={"session_id": sid, "kind": "photo", "caption": "Nameplate"},
                    files={"file": ("plate.png", png, "image/png")}, headers=H["tester"])
    assert r.status_code == 201
    got = client.get(f"/attachments/{r.json()['id']}", headers=H["reviewer"])
    assert got.content == png and got.headers["content-type"] == "image/png"
    assert client.post("/attachments", data={"session_id": sid}, files={"file": ("a.exe", b"x", "application/x-msdownload")},
                       headers=H["tester"]).status_code == 415


def test_repository_dashboard_insights(client, H):
    r = client.get("/reports?search=DW-15&page_size=5", headers=H["reviewer"]).json()
    assert r["total"] >= 1 and {"report_no", "verdict", "manufacturer"} <= set(r["items"][0])
    assert client.get("/reports?verdict=FAIL&status=Approved", headers=H["reviewer"]).json()["total"] >= 2
    assert client.get("/reports/export.csv", headers=H["admin"]).text.startswith("session_id,report_no")
    st = client.get("/dashboard/stats", headers=H["reviewer"]).json()
    assert st["completed"] >= 6 and st["recent_activity"]
    fi = client.get("/dashboard/failure-insights", headers=H["reviewer"]).json()
    assert fi["most_failed_tests"][0]["failures"] >= 1
    assert any(m["repeat"] for m in fi["repeat_failing_models"])                    # seeded repeat failure
    inst = client.get("/reports?search=DW-15X", headers=H["reviewer"]).json()["items"][0]["instrument_id"]
    assert client.get(f"/instruments/{inst}", headers=H["reviewer"]).json()["history"]


def test_rulesets_and_impact(client, H):
    import json
    from pathlib import Path
    import engine
    data = json.loads((Path(engine.__file__).parent / "rulesets" / "oiml_r76_v1.json").read_text())
    data["version"] = "2.0.0-test"
    assert client.post("/rulesets", json={"id": "x"}, headers=H["admin"]).status_code == 422
    assert client.post("/rulesets", json=data, headers=H["admin"]).status_code == 201
    assert client.post("/rulesets", json=data, headers=H["admin"]).status_code == 409
    imp = client.get("/rulesets/2.0.0-test/impact", headers=H["admin"]).json()
    assert imp["sessions_checked"] >= 6 and imp["verdicts_flipped"] == 0            # identical rules: no flips


def test_load_sample_idempotent_and_audit(client, H):
    a = client.post("/demo/load-sample", headers=H["tester"]).json()
    b = client.post("/demo/load-sample", headers=H["tester"]).json()
    assert a == b
    v = client.post(f"/sessions/{a['session_id']}/evaluate", headers=H["tester"]).json()
    assert v["rounding_traps"] == 1
    with SessionLocal() as db:
        assert db.query(AuditLog).count() > 20 and db.query(Report).count() >= 7
        assert db.query(AuditLog).filter(AuditLog.entity == "TestSession", AuditLog.action == "update").count() > 0


def test_register_and_admin_create_user(client, H):
    r = client.post("/auth/register", json={"email": "New.User@Example.com", "password": "Password1",
                                            "full_name": "New User"})
    assert r.status_code == 201 and r.json()["role"] == "Tester"
    tok = {"Authorization": "Bearer " + r.json()["access_token"]}
    assert client.get("/auth/me", headers=tok).json()["email"] == "new.user@example.com"
    assert client.post("/auth/register", json={"email": "new.user@example.com", "password": "Password1",
                                               "full_name": "x"}).status_code == 409
    assert client.post("/auth/register", json={"email": "a@b.co", "password": "short", "full_name": "x"}).status_code == 422
    assert client.post("/users", json={"email": "z@z.co", "password": "Password1", "full_name": "Z",
                                       "role": "Reviewer"}, headers=tok).status_code == 403
    r = client.post("/users", json={"email": "rev2@example.com", "password": "Password1", "full_name": "Rev Two",
                                    "role": "Reviewer"}, headers=H["admin"])
    assert r.status_code == 201 and r.json()["role"] == "Reviewer"
    assert client.post("/users", json={"email": "q@q.co", "password": "Password1", "full_name": "Q",
                                       "role": "Boss"}, headers=H["admin"]).status_code == 422
