"""QR code helper. Every report gets a QR that points at the public /verify/{hash} page."""
import base64
import io

import qrcode


def qr_png_bytes(url: str) -> bytes:
    img = qrcode.make(url, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def qr_data_uri(url: str) -> str:
    return f"data:image/png;base64,{base64.b64encode(qr_png_bytes(url)).decode()}"
