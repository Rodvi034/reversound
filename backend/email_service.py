"""
Email Service v2 — Real SMTP via Gmail + Resend fallback
Priority: SMTP (smtplib + Gmail) → Resend → Mock log
"""
import os
import asyncio
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png"
PLATFORM_NAME = "ReverSound"
PLATFORM_URL = "reversound.com"
SENDER_NAME = f"{PLATFORM_NAME} <{os.environ.get('SMTP_EMAIL', 'noreply@reversound.com')}>"

def _base_template(content: str, preview_text: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{PLATFORM_NAME}</title><meta name="description" content="{preview_text}" />
</head>
<body style="margin:0;padding:0;background-color:#0d0d0f;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#141416;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <tr>
        <td align="center" style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(16,185,129,0.05));">
          <img src="{LOGO_URL}" alt="ReverSound" width="40" height="40" style="display:inline-block;vertical-align:middle;border-radius:8px;" />
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:bold;color:#fff;letter-spacing:3px;">REVERSOUND</span>
        </td>
      </tr>
      <tr><td style="padding:32px;">{content}</td></tr>
      <tr>
        <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0;">
            &copy; 2026 ReverSound &mdash; <a href="https://{PLATFORM_URL}" style="color:#8b5cf6;text-decoration:none;">{PLATFORM_URL}</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>"""

def _btn(text, url, color="#8b5cf6"):
    return f'<table cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td style="background:{color};border-radius:6px;"><a href="{url}" style="display:inline-block;padding:14px 36px;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;">{text}</a></td></tr></table>'

# ── Email Templates ────────────────────────────────────────────────────────────

def verification_email(name: str, verify_url: str) -> tuple[str, str]:
    subject = "ReverSound - E-posta Adresinizi Doğrulayın"
    content = f"""
    <h2 style="color:#8b5cf6;margin:0 0 8px;font-size:22px;">Hesabini Aktive Et</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Merhaba <strong style="color:#fff;">{name}</strong>,<br/>
      ReverSound'a kayit oldugunuz icin tesekkurler! Hesabinizi aktive etmek icin asagidaki butona tiklayin.
    </p>
    <p style="color:#a1a1aa;font-size:12px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:12px;">
      Bu link <strong style="color:#fff;">24 saat</strong> gecerlidir. Hesabiniz dogrulanana kadar giris yapamazsiniz.
    </p>
    {_btn("E-postami Dogrula", verify_url)}
    <p style="color:#6b7280;font-size:11px;text-align:center;">
      Butona tikklayamazaniz: <a href="{verify_url}" style="color:#8b5cf6;">{verify_url}</a><br/>
      Bu kaydı siz yapmadıysanız, bu e-postayı görmezden gelin.
    </p>"""
    return subject, _base_template(content, f"ReverSound e-posta dogrulama - {name}")

def welcome_email(name: str, role: str, credits: int = 100) -> tuple[str, str]:
    subject = f"ReverSound'a Hos Geldiniz, {name}!"
    content = f"""
    <h2 style="color:#10b981;margin:0 0 8px;font-size:22px;">Hosgeldiniz, {name}!</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hesabiniz dogrulandi. Simdi <strong style="color:#fff;">ReverSound</strong>'un tum ozelliklerine erisebilirsiniz.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Hosgeldins Kredisi:</td>
        <td style="color:#10b981;font-size:13px;font-weight:bold;text-align:right;padding:4px 0;">+{credits} Kredi</td>
      </tr>
      <tr>
        <td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Rol:</td>
        <td style="color:#8b5cf6;font-size:13px;font-weight:bold;text-align:right;padding:4px 0;text-transform:capitalize;">{role}</td>
      </tr>
    </table>
    {_btn("Platforma Git", f"https://{PLATFORM_URL}/dashboard")}"""
    return subject, _base_template(content, f"Hosgeldiniz {name}!")

def new_order_email(seller_name: str, buyer_name: str, gig_title: str, tier: str, price: float, order_id: str) -> tuple[str, str]:
    subject = f"Yeni Siparis: {gig_title} - {price:.0f} TRY"
    content = f"""
    <h2 style="color:#10b981;margin:0 0 8px;">Yeni Siparis Aldiniz!</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 20px;">
      <strong style="color:#fff;">{buyer_name}</strong> sizin hizmetinizi siparis etti.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Hizmet:</td><td style="color:#fff;font-size:13px;text-align:right;padding:4px 0;">{gig_title}</td></tr>
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Paket:</td><td style="color:#fff;font-size:13px;text-align:right;padding:4px 0;text-transform:capitalize;">{tier}</td></tr>
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Tutar (Escrow):</td><td style="color:#f59e0b;font-size:13px;font-weight:bold;text-align:right;padding:4px 0;">{price:.2f} TRY</td></tr>
    </table>
    {_btn("Siparisi Goruntule", f"https://{PLATFORM_URL}/orders/{order_id}", "#10b981")}"""
    return subject, _base_template(content, f"Yeni siparis: {gig_title}")

def escrow_released_email(seller_name: str, gig_title: str, gross: float, net: float, fee: float, fee_pct: float, tier_name: str, order_id: str) -> tuple[str, str]:
    subject = f"Odeme Alindi: {net:.2f} TRY - {gig_title}"
    content = f"""
    <h2 style="color:#10b981;margin:0 0 8px;">Odemeniz Aktarildi!</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Gig:</td><td style="color:#fff;font-size:13px;text-align:right;">{gig_title}</td></tr>
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Brut:</td><td style="color:#fff;font-size:13px;text-align:right;">{gross:.2f} TRY</td></tr>
      <tr><td style="color:#a1a1aa;font-size:13px;padding:4px 0;">Platform Kesinti ({tier_name} %{fee_pct*100:.1f}):</td><td style="color:#ec4899;font-size:13px;text-align:right;">-{fee:.2f} TRY</td></tr>
      <tr><td style="color:#a1a1aa;font-size:13px;font-weight:bold;padding:4px 0;">Net Kazanc:</td><td style="color:#10b981;font-size:14px;font-weight:bold;text-align:right;">{net:.2f} TRY</td></tr>
    </table>
    {_btn("Cuzdani Goruntule", f"https://{PLATFORM_URL}/wallet", "#10b981")}"""
    return subject, _base_template(content, f"{net:.2f} TRY odemeniz alindi")

# ── Core Send Function ─────────────────────────────────────────────────────────

async def send_email(to_email: str, subject: str, html: str, db=None) -> bool:
    smtp_email = os.environ.get("SMTP_EMAIL", "")
    smtp_pass = os.environ.get("SMTP_APP_PASSWORD", "")

    # Try SMTP first
    if smtp_email and smtp_pass:
        success = await _send_smtp(to_email, subject, html, smtp_email, smtp_pass)
        if success:
            _queue(db, to_email, subject, "sent_smtp")
            return True

    # Fallback: Resend
    resend_key = os.environ.get("RESEND_API_KEY", "")
    if resend_key and resend_key.startswith("re_"):
        try:
            import resend as resend_lib
            resend_lib.api_key = resend_key
            params = {"from": SENDER_NAME, "to": [to_email], "subject": subject, "html": html}
            result = await asyncio.to_thread(resend_lib.Emails.send, params)
            logger.info(f"Email sent via Resend to {to_email}: {result.get('id')}")
            _queue(db, to_email, subject, "sent_resend")
            return True
        except Exception as e:
            logger.error(f"Resend error: {e}")

    # Final fallback: log
    logger.info(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
    _queue(db, to_email, subject, "queued_mock")
    return True

async def _send_smtp(to_email: str, subject: str, html: str, smtp_email: str, smtp_pass: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SENDER_NAME
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    def _send_sync():
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx) as server:
            server.login(smtp_email, smtp_pass)
            server.sendmail(smtp_email, to_email, msg.as_string())

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_sync)
        logger.info(f"Email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP error for {to_email}: {e}")
        return False

def _queue(db, to_email, subject, status, error=None):
    if db is None: return
    async def _insert():
        try:
            await db.email_queue.insert_one({
                "to": to_email, "subject": subject, "status": status,
                "error": error, "created_at": datetime.now(timezone.utc)
            })
        except Exception: pass
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running(): loop.create_task(_insert())
    except Exception: pass

# ── Convenience senders ────────────────────────────────────────────────────────

async def send_verification(to_email: str, name: str, verify_url: str, db=None):
    subj, html = verification_email(name, verify_url)
    await send_email(to_email, subj, html, db)

async def send_welcome(to_email: str, name: str, role: str, db=None):
    subj, html = welcome_email(name, role)
    await send_email(to_email, subj, html, db)

async def send_new_order(seller_email, seller_name, buyer_name, gig_title, tier, price, order_id, db=None):
    subj, html = new_order_email(seller_name, buyer_name, gig_title, tier, price, order_id)
    await send_email(seller_email, subj, html, db)

async def send_escrow_released(seller_email, seller_name, gig_title, gross, net, fee, fee_pct, tier_name, order_id, db=None):
    subj, html = escrow_released_email(seller_name, gig_title, gross, net, fee, fee_pct, tier_name, order_id)
    await send_email(seller_email, subj, html, db)
