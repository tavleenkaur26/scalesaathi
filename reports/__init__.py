"""
P4's report package. Lives at the REPO ROOT (next to /engine, /backend, /frontend).

backend/routes/repository.py does `import reports` and calls:
    reports.generate_pdf(context)          -> bytes  (application/pdf)
    reports.generate_docx(context)         -> bytes  (application/vnd...wordprocessingml.document)
    reports.render_verify_page(data)       -> str     (optional; HTML for GET /verify/{hash})

`context` is exactly backend.services.reporting.get_report_context(...). See
reports/context_example.py for a fabricated example you can run without a DB.
"""
from .pdf import generate_pdf
from .docx import generate_docx
from .verify_page import render_verify_page

__all__ = ["generate_pdf", "generate_docx", "render_verify_page"]
