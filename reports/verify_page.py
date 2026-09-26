"""Branded public verification page for GET /verify/{hash}.

backend/routes/repository.py calls this as an optional hook; if it's absent
or errors, it falls back to backend.services.reporting.verify_html(). `data`
is the dict returned by backend.services.reporting.verify(db, hash):
{status: "genuine"|"modified"|"not_found", report_no, instrument_model,
 serial_no, manufacturer, accuracy_class, verdict, approved_by, approved_at,
 lab_name}
"""
import html as _html

from .common import format_dt
from .i18n import labels

_ROW_KEYS = [
    ("verify_report_no", "report_no"),
    ("verify_instrument", None),          # composed from manufacturer + instrument_model
    ("verify_serial", "serial_no"),
    ("verify_class", "accuracy_class"),
    ("verify_verdict", "verdict"),
    ("approved_by", "approved_by"),
    ("approved_on", "approved_at"),
    ("verify_lab", "lab_name"),
]


def render_verify_page(data: dict, lang: str = "en") -> str:
    L = labels(lang)
    e = lambda v: _html.escape(str(v if v is not None else "-"))

    if data["status"] == "not_found":
        heading, colour, icon = L["not_found"], "#b42318", "&#10005;"
        body = f"<p class='msg'>{e(L['no_report_msg'])}</p>"
    else:
        genuine = data["status"] == "genuine"
        heading = L["genuine"] if genuine else L["modified"]
        colour = "#067647" if genuine else "#b42318"
        icon = "&#10003;" if genuine else "&#9888;"
        rows = []
        for label_key, field in _ROW_KEYS:
            if field is None:
                val = f"{data.get('manufacturer', '-')} {data.get('instrument_model', '-')}"
            elif field == "approved_at":
                val = format_dt(data.get(field))
            else:
                val = data.get(field)
            rows.append((L[label_key], val))
        body = ("<table>" + "".join(
            f"<tr><th>{e(k)}</th><td>{e(v)}</td></tr>" for k, v in rows) + "</table>")

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ScaleSaathi &mdash; verification</title>
<style>
  body {{ font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background: #f5f6f8;
          margin: 0; padding: 2rem 1rem; }}
  .card {{ max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px;
           box-shadow: 0 2px 12px rgba(0,0,0,.08); padding: 1.75rem; }}
  .icon {{ font-size: 2.4rem; color: {colour}; text-align: center; }}
  h1 {{ color: {colour}; font-size: 1.25rem; text-align: center; margin: .3rem 0 1.2rem; }}
  .msg {{ text-align: center; color: #555; }}
  table {{ width: 100%; border-collapse: collapse; font-size: .92rem; }}
  th {{ text-align: left; color: #666; padding: 6px 10px 6px 0; font-weight: 500; width: 42%; }}
  td {{ padding: 6px 0; color: #111; }}
  .brand {{ text-align: center; margin-top: 1.4rem; font-size: .78rem; color: #999; }}
</style>
</head>
<body>
  <div class="card">
    <div class="icon">{icon}</div>
    <h1>{e(heading)}</h1>
    {body}
  </div>
  <div class="brand">ScaleSaathi &mdash; OIML R 76-1 legal-metrology verification</div>
</body>
</html>"""
