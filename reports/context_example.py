"""A fabricated context matching backend.services.reporting.get_report_context(),
so you can test PDF/DOCX generation without a running DB.

Run:  python -m reports.context_example
"""
EXAMPLE_CONTEXT = {
    "lang": "en",
    "report": {
        "report_no": "SS-2026-0007",
        "hash": "3f9a7c1e2b8d4f0a6c5e9b1d7a2f4c8e0b6d3a1f9c7e5b2d4a6f8c0e2b4d6f81",
        "verify_url": "https://scalesaathi.example.org/verify/3f9a7c1e2b8d4f0a6c5e9b1d7a2f4c8e0b6d3a1f9c7e5b2d4a6f8c0e2b4d6f81",
        "approved_at": "2026-09-26 14:32",
        "overall_verdict": "FAIL",
        "ruleset_version": "oiml_r76_v1",
    },
    "approved_by": {"full_name": "Dr. Anita Rao", "designation": "Chief Metrology Officer",
                     "signature_data_uri": None},
    "tester": {"full_name": "Rahul Mehta", "designation": "Senior Tester"},
    "lab": {"name": "National Weights & Measures Lab, Delhi",
            "address": "Sector 5, Metrology Bhawan, New Delhi",
            "accreditation_no": "NABL-T-1123", "logo_data_uri": None,
            "default_conditions_text": None},
    "manufacturer": {"name": "Accura Scales Pvt. Ltd.", "address": "MIDC, Pune",
                      "contact_person": "S. Kulkarni", "phone": "9876543210",
                      "email": "info@accurascales.example"},
    "instrument": {"model": "AX-500", "serial_no": "AX500-2291", "max_capacity": 5000,
                   "min_capacity": 20, "e": 1, "d": 1, "accuracy_class": "III",
                   "max_tare": 2000, "support_points": 4, "temp_min": -10, "temp_max": 40},
    "session": {"id": 42, "tested_at": "2026-09-25 11:00", "location": "Lab Bay 2",
                "conditions": {"temperature_c": 24.5, "humidity_pct": 55, "pressure_hpa": 1004}},
    "verdict": {"overall": "FAIL", "marginal_results": 1, "rounding_traps": 1,
                "failed_tests": ["weighing"], "warnings": []},
    "results": [
        {"test": "weighing", "load": 1000, "e": 1, "error": -3.0, "mpe": 2.5, "result": "FAIL",
         "utilisation": 1.2, "marginal": False, "clause": "R76-1 3.6.1",
         "explanation": "Error of -3.0 g exceeds MPE of ±2.5 g for loads between 500e and 2000e.",
         "naive": {"error": 2.0, "result": "PASS"}},
        {"test": "eccentricity", "load": 2500, "e": 1, "error": 1.0, "mpe": 5.0, "result": "PASS",
         "utilisation": 0.2, "marginal": False, "clause": "R76-1 3.6.2",
         "explanation": "Corner-load error within MPE.", "naive": {"error": 1.0, "result": "PASS"}},
        {"test": "repeatability", "load": 5000, "e": 1, "error": 2.1, "mpe": 2.5, "result": "PASS",
         "utilisation": 0.84, "marginal": True, "clause": "R76-1 3.6.3",
         "explanation": "Spread of repeat readings uses 84% of MPE (marginal).",
         "naive": {"error": 2.1, "result": "PASS"}},
    ],
    "observations": {},
    "attachments": [],
    "annexes": [],
}


if __name__ == "__main__":
    from . import generate_docx, generate_pdf, render_verify_page

    with open("sample_report.pdf", "wb") as f:
        f.write(generate_pdf(EXAMPLE_CONTEXT))
    with open("sample_report.docx", "wb") as f:
        f.write(generate_docx(EXAMPLE_CONTEXT))
    with open("sample_verify.html", "w") as f:
        f.write(render_verify_page({
            "status": "genuine", "report_no": "SS-2026-0007", "instrument_model": "AX-500",
            "serial_no": "AX500-2291", "manufacturer": "Accura Scales Pvt. Ltd.",
            "accuracy_class": "III", "verdict": "FAIL", "approved_by": "Dr. Anita Rao",
            "approved_at": "2026-09-26 14:32", "lab_name": "National Weights & Measures Lab, Delhi",
        }))
    print("Wrote sample_report.pdf, sample_report.docx, sample_verify.html")
