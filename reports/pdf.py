"""PDF generation: Jinja2 renders reports/templates/report.html, WeasyPrint prints it.

pip install weasyprint jinja2 qrcode[pil]
(WeasyPrint also needs system libs: pango, cairo, gdk-pixbuf — see reports/README.md)
"""
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from .common import build_view

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_html(context: dict) -> str:
    view = build_view(context)
    template = _env.get_template("report.html")
    return template.render(**view)


def generate_pdf(context: dict) -> bytes:
    """context = backend.services.reporting.get_report_context(db, session, lang)."""
    html_str = render_html(context)
    return HTML(string=html_str, base_url=str(TEMPLATES_DIR)).write_pdf()
