from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pathlib import Path
from datetime import datetime

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

def timestamp() -> str:
    d = datetime.now()
    return d.strftime("%Y%m%d_%H%M%S")

def export_pdf(image_bytes: bytes | None, confidence_text: str) -> str:
    filename = f"PG-Scan_{timestamp()}.pdf"
    out_path = REPORTS_DIR / filename

    c = canvas.Canvas(str(out_path), pagesize=A4)
    w, h = A4
    margin = 0.5 * inch
    y = h - margin

    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, y, "PG Scanner Report")
    y -= 22

    c.setFont("Helvetica", 11)
    c.drawString(margin, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    y -= 16

    # Draw image if available
    if image_bytes:
        try:
            img = ImageReader(image_bytes)
            # Fit image to page width with aspect preserved
            max_w = w - 2*margin
            iw, ih = img.getSize()
            scale = max_w / iw
            draw_w = max_w
            draw_h = ih * scale
            if y - draw_h < margin:
                c.showPage()
                y = h - margin
            c.drawImage(img, margin, y - draw_h, width=draw_w, height=draw_h)
            y -= draw_h + 18
        except Exception:
            c.setFillColorRGB(1,0,0)
            c.drawString(margin, y, "Snapshot unavailable (failed to render).")
            c.setFillColorRGB(0,0,0)
            y -= 18
    else:
        c.setFillColorRGB(1,0,0)
        c.drawString(margin, y, "Snapshot unavailable (camera not ready).")
        c.setFillColorRGB(0,0,0)
        y -= 18

    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, y, "Confidence Levels")
    y -= 16

    c.setFont("Helvetica", 12)
    # Wrap confidence text roughly
    lines = confidence_text.splitlines() or ["No confidence values available."]
    for line in lines:
        if y < margin + 14:
            c.showPage()
            y = h - margin
            c.setFont("Helvetica", 12)
        c.drawString(margin, y, line[:120])
        y -= 14

    c.save()
    return str(out_path)
