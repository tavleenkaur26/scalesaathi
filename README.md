# ScaleSaathi

OIML R 76 test-report software for non-automatic weighing instruments, built for Smart India Hackathon 2026 (PS26035), sponsored by the Ministry of Consumer Affairs, Food & Public Distribution.

**Live App:** https://scalesaathi.vercel.app

## Problem

Weighing instruments used in trade must obtain model approval under the Legal Metrology Act, 2009 and the Legal Metrology (General) Rules, 2011. Designated laboratories evaluate each model against OIML Recommendation R 76.

Today, test reports are prepared manually with spreadsheets and document templates. Permissible errors are looked up in printed tables and calculated by hand, which is slow, error-prone and inconsistent between laboratories.

## What ScaleSaathi Does

A tester registers an instrument, follows a generated test plan, and enters the observations. The rule engine evaluates every reading against OIML R 76-1:2006, a reviewer approves the result, and a standardised report is issued.

- **Specification check:** Max, Min, e, d and accuracy class are validated against R 76-1 Table 3 before testing starts.
- **Test plan:** test loads are generated automatically, including the loads where the permissible error changes (A.4.4.1).
- **Error calculation:** errors are computed with the changeover-point method (A.4.4.3), which removes display rounding as required by 3.5.3.2.
- **Tests evaluated:** weighing, eccentricity, repeatability, discrimination, zero-setting and tare-setting accuracy, static temperature, temperature effect on zero, and disturbances (significant-fault check).
- **Explainable verdicts:** every result shows the error, the permissible error, the formula used and the R 76 clause.
- **Rounding-trap detection:** readings where a naive "indication minus load" calculation gives a different verdict from the R 76 method are flagged.
- **Reports:** PDF and Word, in English or Hindi, with lab, instrument and test details filled in automatically.
- **Verification:** each approved report carries a QR code. Scanning it confirms the report is genuine, or flags it if the record was changed after approval.
- **Ruleset versions:** all limits live in a versioned, clause-tagged ruleset. When a new version is uploaded, impact analysis shows which past verdicts would change.
- **Repository and dashboard:** search, instrument history, CSV export, and failure trends by test, manufacturer and model.

ScaleSaathi supports laboratory officers in preparing type-evaluation reports. Model approval decisions remain with the competent Legal Metrology authority.

## Roles

- **Tester:** registers instruments, records observations and submits sessions.
- **Reviewer:** reviews submitted sessions and approves or returns them. A tester can never approve their own session.
- **Admin:** manages rulesets and user accounts.

Public sign-up creates Tester accounts only. Reviewer and Admin accounts are created by an Admin.

## Project Structure

```css
engine/                 OIML R 76 rule engine (pure Python, no I/O)
├── rulesets/           Versioned, clause-tagged rulesets
├── spec_check.py       Specification checks (Table 3)
├── test_plan.py        Test plan generation
├── calc.py             Changeover-point and naive error calculation
├── evaluators.py       One evaluator per R 76 test
├── verdict.py          Overall verdict
├── impact.py           Ruleset impact analysis
└── seeds/              Sample sessions for the demo

backend/                API (FastAPI)
├── routes/             HTTP endpoints
├── services/           Workflow, evaluation, reporting, analytics, audit
├── models.py           Database models
├── auth.py             JWT authentication and roles
└── main.py             Application entry point

reports/                PDF and Word report generation, QR code, verification page

frontend/               Web app (React + Vite)
└── src/
    ├── pages/          Instruments, test sessions, review, reports, dashboard
    ├── layouts/        App and public layouts
    └── api/            API client

tests/                  Rule engine tests
docs/                   Calculation methodology and architecture documentation
scripts/                Seed and demo-ruleset generators
```

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic
- **Frontend:** React, Vite, React Router
- **Database:** PostgreSQL (Neon) in deployment, SQLite locally
- **Auth:** JWT, bcrypt
- **Reports:** WeasyPrint, Jinja2, python-docx, qrcode
- **Deployment:** Render (backend, Docker), Vercel (frontend)

## Running Locally

### Backend

From the repository root:

```bash
pip install -r backend/requirements.txt -r reports/requirements.txt
uvicorn backend.main:app --reload
```

Run the command from the repository root, not from inside `backend/`, because the backend imports `engine/` and `reports/` directly.

Leave `DATABASE_URL` unset to use a local SQLite database. On first start, the backend creates the tables, a demo lab, three demo accounts, ruleset v1 and sample test sessions.

WeasyPrint needs system libraries. On macOS:

```bash
brew install pango
```

Demo accounts (password `Demo@1234`): `admin@scalesaathi.demo`, `tester@scalesaathi.demo`, `reviewer@scalesaathi.demo`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file and set the backend URL:

```ini
VITE_API_BASE_URL=http://localhost:8000
```

### Tests

```bash
python -m pytest tests -q            # rule engine
python -m pytest backend/tests -q    # API, workflow and verification
```

## References

- OIML R 76-1:2006, Non-automatic weighing instruments, Part 1: Metrological and technical requirements, Tests
- OIML R 76-2, Part 2: Test report format
- Legal Metrology Act, 2009 and Legal Metrology (General) Rules, 2011, Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, Government of India
