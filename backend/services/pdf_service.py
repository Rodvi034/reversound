"""
PDF Generator Service - License Contracts & Invoices
Uses fpdf2 for lightweight PDF generation.
"""
import io
import uuid
from datetime import datetime, timezone
from fpdf import FPDF

LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png"
PLATFORM_NAME = "ReverSound"
PLATFORM_URL = "reversound.com"
PLATFORM_EMAIL = "legal@reversound.com"

LICENSE_TERMS = {
    "basic": {
        "name": "Basic Lease",
        "streams": "2,500",
        "sales": "2,500",
        "formats": "MP3 (320kbps)",
        "distribution": "Digital distribution",
        "radio": False,
        "exclusive": False,
        "for_profit": True,
        "terms": [
            "Non-exclusive license - producer retains ownership",
            "MP3 format delivery only",
            "Max 2,500 digital/streaming sales",
            "Max 2,500 total streams",
            "For-profit use allowed",
            "Buyer must credit: 'Prod. by [Producer Name]'",
            "Cannot be resold or sublicensed",
        ]
    },
    "premium": {
        "name": "Premium Lease",
        "streams": "10,000",
        "sales": "25,000",
        "formats": "WAV + Stems",
        "distribution": "Digital + Radio",
        "radio": True,
        "exclusive": False,
        "for_profit": True,
        "terms": [
            "Non-exclusive license - producer retains ownership",
            "WAV format + tracked stems delivery",
            "Max 25,000 digital/streaming sales",
            "Max 10,000 total streams",
            "Radio broadcasting rights included",
            "For-profit use allowed",
            "Buyer must credit: 'Prod. by [Producer Name]'",
            "Cannot be resold or sublicensed",
        ]
    },
    "exclusive": {
        "name": "Exclusive Rights",
        "streams": "Unlimited",
        "sales": "Unlimited",
        "formats": "WAV + Stems + Tracked",
        "distribution": "Full rights",
        "radio": True,
        "exclusive": True,
        "for_profit": True,
        "terms": [
            "Exclusive ownership transfer upon payment",
            "Beat will be removed from marketplace",
            "All source files (WAV, stems, MIDI) delivered",
            "Unlimited streams and sales",
            "Full commercial/broadcast rights",
            "Can be sublicensed or resold",
            "Producer credit recommended but not required",
            "This agreement constitutes full copyright transfer",
        ]
    }
}


def _add_header(pdf: FPDF, doc_type: str):
    pdf.set_fill_color(13, 13, 15)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(139, 92, 246)
    pdf.set_y(8)
    pdf.cell(0, 10, PLATFORM_NAME.upper(), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(161, 161, 170)
    pdf.cell(0, 6, f"{PLATFORM_URL} · {PLATFORM_EMAIL}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(45)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(30, 30, 35)
    pdf.cell(0, 12, doc_type, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)


def _add_section(pdf: FPDF, title: str):
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(139, 92, 246)
    pdf.set_fill_color(248, 247, 255)
    pdf.cell(0, 9, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(30, 30, 35)
    pdf.ln(2)


def _kv(pdf: FPDF, key: str, value: str):
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(80, 80, 90)
    pdf.cell(55, 7, key + ":", new_x="RIGHT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(20, 20, 25)
    pdf.multi_cell(0, 7, str(value), new_x="LMARGIN", new_y="NEXT")


def generate_license_contract(purchase_data: dict) -> bytes:
    """
    Generate a PDF License Agreement for a beat purchase.
    purchase_data keys: buyer_name, buyer_email, producer_name, producer_username,
                        beat_title, genre, bpm, key, license_type, price, rights,
                        purchase_id, purchased_at
    """
    license_type = purchase_data.get("license_type", "basic")
    lic_info = LICENSE_TERMS.get(license_type, LICENSE_TERMS["basic"])

    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.add_page()

    _add_header(pdf, "MUSIC LICENSE AGREEMENT")

    # Reference box
    ref = purchase_data.get("purchase_id", str(uuid.uuid4())[:8].upper())
    dt = purchase_data.get("purchased_at", datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"))
    pdf.set_fill_color(245, 245, 250)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 110)
    pdf.cell(0, 7, f"  Contract Reference: {ref}  |  Date: {dt}  |  Issued by {PLATFORM_NAME}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Parties
    _add_section(pdf, "PARTIES TO THIS AGREEMENT")
    _kv(pdf, "Licensor (Producer)", purchase_data.get("producer_name", "N/A") + f" (@{purchase_data.get('producer_username', '')})")
    _kv(pdf, "Licensee (Buyer)", f"{purchase_data.get('buyer_name', 'N/A')} - {purchase_data.get('buyer_email', 'N/A')}")
    _kv(pdf, "Platform", f"{PLATFORM_NAME} ({PLATFORM_URL})")
    pdf.ln(3)

    # Beat details
    _add_section(pdf, "LICENSED WORK")
    _kv(pdf, "Beat Title", purchase_data.get("beat_title", "N/A"))
    _kv(pdf, "Genre", purchase_data.get("genre", "N/A"))
    _kv(pdf, "BPM", str(purchase_data.get("bpm", "N/A")))
    _kv(pdf, "Musical Key", purchase_data.get("key", "N/A"))
    pdf.ln(3)

    # License tier
    _add_section(pdf, f"LICENSE TYPE: {lic_info['name'].upper()}")
    _kv(pdf, "License Type", lic_info["name"])
    _kv(pdf, "Delivery Format", lic_info["formats"])
    _kv(pdf, "Streaming Limit", lic_info["streams"])
    _kv(pdf, "Sales Limit", lic_info["sales"])
    _kv(pdf, "Radio Rights", "Yes" if lic_info["radio"] else "No")
    _kv(pdf, "Exclusive Rights", "YES - Full Copyright Transfer" if lic_info["exclusive"] else "No - Non-Exclusive")
    _kv(pdf, "Purchase Price", f"TRY {purchase_data.get('price', '0'):.2f}" if isinstance(purchase_data.get('price'), (int, float)) else str(purchase_data.get('price', '0')))
    pdf.ln(3)

    # Terms
    _add_section(pdf, "LICENSE TERMS & CONDITIONS")
    for i, term in enumerate(lic_info["terms"], 1):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(40, 40, 50)
        pdf.cell(8, 7, f"{i}.")
        pdf.multi_cell(0, 7, term, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Governing law
    _add_section(pdf, "GOVERNING LAW")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 50)
    pdf.multi_cell(0, 7, (
        "This Agreement is governed by the laws of the Republic of Turkey. "
        "Any disputes shall be resolved through the arbitration system provided by "
        f"{PLATFORM_NAME} platform or through Istanbul courts of competent jurisdiction."
    ), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Signature line
    pdf.set_draw_color(139, 92, 246)
    pdf.set_line_width(0.3)
    pdf.line(20, pdf.get_y(), 95, pdf.get_y())
    pdf.line(115, pdf.get_y(), 190, pdf.get_y())
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 110)
    pdf.set_y(pdf.get_y() + 2)
    pdf.cell(95, 5, "Licensor Signature / Electronic Acceptance")
    pdf.cell(0, 5, "Licensee Signature / Electronic Acceptance")

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 160)
    pdf.cell(0, 5, f"{PLATFORM_NAME} · Secure Escrow · {PLATFORM_URL} · This is a legally binding document.", align="C")

    return bytes(pdf.output())


def generate_invoice(invoice_data: dict) -> bytes:
    """
    Generate a PDF Invoice for a transaction.
    invoice_data keys: invoice_number, buyer_name, buyer_email, seller_name,
                       items=[{title, license, price}], subtotal, platform_fee, total,
                       payment_method, transaction_id, issued_at
    """
    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.add_page()

    _add_header(pdf, "INVOICE / FATURA")

    # Invoice meta
    inv_no = invoice_data.get("invoice_number", f"INV-{str(uuid.uuid4())[:8].upper()}")
    issued = invoice_data.get("issued_at", datetime.now(timezone.utc).strftime("%d/%m/%Y"))
    pdf.set_fill_color(245, 245, 250)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 110)
    pdf.cell(0, 7, f"  Invoice No: {inv_no}  |  Date: {issued}  |  Platform: {PLATFORM_NAME}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Bill to / from
    _add_section(pdf, "BILL TO / FROM")
    _kv(pdf, "Buyer", f"{invoice_data.get('buyer_name', 'N/A')} ({invoice_data.get('buyer_email', 'N/A')})")
    _kv(pdf, "Seller/Producer", invoice_data.get("seller_name", "N/A"))
    _kv(pdf, "Platform", f"{PLATFORM_NAME} ({PLATFORM_URL})")
    pdf.ln(3)

    # Items table
    _add_section(pdf, "ITEMS")
    pdf.set_fill_color(139, 92, 246)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(100, 9, "  Description", fill=True)
    pdf.cell(45, 9, "License", fill=True)
    pdf.cell(0, 9, "Amount", fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    for i, item in enumerate(invoice_data.get("items", [])):
        bg = (245, 245, 250) if i % 2 == 0 else (255, 255, 255)
        pdf.set_fill_color(*bg)
        pdf.set_text_color(20, 20, 25)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(100, 8, f"  {item.get('title', 'N/A')}", fill=True)
        pdf.cell(45, 8, item.get("license", ""), fill=True)
        pdf.cell(0, 8, f"TRY {float(item.get('price', 0)):.2f}", fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)

    # Summary
    subtotal = invoice_data.get("subtotal", 0)
    platform_fee = invoice_data.get("platform_fee", 0)
    total = invoice_data.get("total", subtotal)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(80, 80, 90)
    pdf.cell(145, 7, "Subtotal:")
    pdf.cell(0, 7, f"TRY {float(subtotal):.2f}", align="R", new_x="LMARGIN", new_y="NEXT")
    if platform_fee:
        pdf.cell(145, 7, "Platform Fee (10%):")
        pdf.cell(0, 7, f"TRY {float(platform_fee):.2f}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_fill_color(139, 92, 246)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(145, 10, "  TOTAL:", fill=True)
    pdf.cell(0, 10, f"TRY {float(total):.2f}", fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Payment info
    _add_section(pdf, "PAYMENT INFORMATION")
    _kv(pdf, "Payment Method", invoice_data.get("payment_method", "ReverSound Wallet / Escrow"))
    _kv(pdf, "Transaction ID", invoice_data.get("transaction_id", "N/A"))
    _kv(pdf, "Status", "PAID - Escrow Released")

    pdf.ln(5)
    pdf.set_y(-18)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 160)
    pdf.cell(0, 5, f"This invoice was automatically generated by {PLATFORM_NAME}. Keep for your records. {PLATFORM_URL}", align="C")

    return bytes(pdf.output())
