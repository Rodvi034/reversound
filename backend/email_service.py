"""
Email Service — Resend integration with mock fallback.
Set RESEND_API_KEY in .env to send real emails.
Without the key, emails are logged to the email_queue collection.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png"
SENDER = os.environ.get("RESEND_SENDER_EMAIL", "noreply@reversound.com")
PLATFORM_URL = "https://reversound.com"

def _base_template(content: str, preview_text: str = "") -> str:
    """Premium dark HTML email template with ReverSound logo."""
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>ReverSound</title>
<meta name="description" content="{preview_text}" />
</head>
<body style="margin:0;padding:0;background-color:#0d0d0f;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="580" cellpadding="0" cellspacing="0" role="presentation"
      style="background-color:#141416;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

      <!-- HEADER: Logo + Brand -->
      <tr>
        <td align="center" style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(16,185,129,0.05));">
          <img src="{LOGO_URL}" alt="ReverSound Logo" width="40" height="40"
            style="display:inline-block;vertical-align:middle;border-radius:8px;" />
          <span style="display:inline-block;vertical-align:middle;margin-left:12px;font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:3px;font-family:Arial,sans-serif;">REVERSOUND</span>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr>
        <td style="padding:32px;">
          {content}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="color:#6b7280;font-size:11px;margin:0 0 4px;">
            © 2026 ReverSound — <a href="{PLATFORM_URL}" style="color:#8b5cf6;text-decoration:none;">reversound.com</a>
          </p>
          <p style="color:#6b7280;font-size:11px;margin:0;">
            Türkiye'nin Müzik Ekosistemi
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""

def btn(text: str, url: str, color: str = "#8b5cf6") -> str:
    return f'<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px auto;"><tr><td align="center" style="background:{color};border-radius:6px;"><a href="{url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:0.5px;">{text}</a></td></tr></table>'

def stat_row(label: str, value: str, color: str = "#8b5cf6") -> str:
    return f'<tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;">{label}</td><td style="padding:8px 0;color:{color};font-size:13px;font-weight:bold;text-align:right;">{value}</td></tr>'

# ── Email Template Builders ────────────────────────────────────────────────────

def welcome_email(name: str, role: str, credits: int = 100) -> tuple[str, str]:
    """Returns (subject, html)."""
    subject = f"ReverSound'a Hoş Geldin, {name}!"
    content = f"""
    <h2 style="color:#8b5cf6;margin:0 0 8px;font-size:22px;">Hoş Geldin, {name}!</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Türkiye'nin lider müzik ekosistemi ReverSound'a katıldın.<br/>
      Başlamak için <strong style="color:#ffffff;">{credits} kredi</strong> hoş geldin bonusu kazandın.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="color:#a1a1aa;font-size:13px;">Rolün:</td>
        <td style="color:#8b5cf6;font-size:13px;font-weight:bold;text-align:right;text-transform:capitalize;">{role}</td>
      </tr>
      <tr>
        <td style="color:#a1a1aa;font-size:13px;">Hoş Geldin Kredisi:</td>
        <td style="color:#10b981;font-size:13px;font-weight:bold;text-align:right;">₺{credits}</td>
      </tr>
    </table>
    <p style="color:#a1a1aa;font-size:13px;line-height:1.6;">
      ✓ Beat Market'e göz at &nbsp;·&nbsp; ✓ Gig oluştur &nbsp;·&nbsp; ✓ AI Kariyer Koçu ile tanış
    </p>
    {btn('Platforma Git', f'{PLATFORM_URL}/dashboard')}
    <p style="color:#6b7280;font-size:12px;text-align:center;">Sorularınız için destek@reversound.com</p>
    """
    return subject, _base_template(content, f"ReverSound'a hoş geldin, {name}!")

def new_order_email(seller_name: str, buyer_name: str, gig_title: str, tier: str, price: float, order_id: str) -> tuple[str, str]:
    subject = f"Yeni Sipariş: {gig_title} — ₺{price:.0f}"
    content = f"""
    <h2 style="color:#10b981;margin:0 0 8px;font-size:20px;">Yeni Sipariş Aldın!</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 20px;">
      <strong style="color:#ffffff;">{buyer_name}</strong> hizmetini sipariş etti. Ödeme güvenli escrow'da bekliyor.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tbody>
        {stat_row("Gig", gig_title)}
        {stat_row("Paket", tier.capitalize())}
        {stat_row("Tutar (Escrow)", f"₺{price:.2f}", "#f59e0b")}
        {stat_row("Alıcı", buyer_name)}
      </tbody>
    </table>
    <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin-bottom:16px;">
      Sipariş panelinizden gereksinimleri inceleyin ve çalışmaya başlayın.
    </p>
    {btn('Siparişi Görüntüle', f'{PLATFORM_URL}/orders/{order_id}', '#10b981')}
    <p style="color:#6b7280;font-size:12px;text-align:center;">Escrow güvencesi: Ödemeniz teslim onayına kadar güvende.</p>
    """
    return subject, _base_template(content, f"Yeni sipariş: {gig_title}")

def escrow_released_email(seller_name: str, gig_title: str, gross: float, net: float, fee: float, fee_pct: float, tier_name: str, order_id: str) -> tuple[str, str]:
    subject = f"Ödeme Alındı: ₺{net:.2f} — {gig_title}"
    content = f"""
    <h2 style="color:#10b981;margin:0 0 8px;font-size:20px;">Ödemen Cüzdanına Aktarıldı!</h2>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 20px;">
      <strong style="color:#ffffff;">{gig_title}</strong> siparişi tamamlandı ve ödemen aktarıldı.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tbody>
        {stat_row("Brüt Tutar", f"₺{gross:.2f}")}
        {stat_row(f"Platform Kesintisi ({tier_name} — %{fee_pct*100:.1f})", f"-₺{fee:.2f}", "#ec4899")}
        {stat_row("Net Kazanç", f"₺{net:.2f}", "#10b981")}
      </tbody>
    </table>
    <p style="color:#8b5cf6;font-size:12px;background:rgba(139,92,246,0.1);border-radius:6px;padding:10px;border:1px solid rgba(139,92,246,0.2);">
      <strong>Revenue Share:</strong> {tier_name} seviyesindesin. Daha fazla satış yaparak komisyonunu düşürebilirsin!
    </p>
    {btn('Cüzdanı Görüntüle', f'{PLATFORM_URL}/wallet', '#10b981')}
    """
    return subject, _base_template(content, f"₺{net:.2f} ödemen alındı!")

# ── Send Function ──────────────────────────────────────────────────────────────

async def send_email(to_email: str, subject: str, html: str, db=None) -> bool:
    """Send email via Resend (if API key set) or log to queue."""
    api_key = os.environ.get("RESEND_API_KEY", "")

    if api_key and api_key.startswith("re_"):
        try:
            import resend
            resend.api_key = api_key
            params = {"from": SENDER, "to": [to_email], "subject": subject, "html": html}
            result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent via Resend to {to_email}: {result.get('id')}")
            _queue_to_db(db, to_email, subject, "sent")
            return True
        except Exception as e:
            logger.error(f"Resend error: {e}")
            _queue_to_db(db, to_email, subject, "failed", str(e))
            return False
    else:
        logger.info(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        _queue_to_db(db, to_email, subject, "queued_mock")
        return True

def _queue_to_db(db, to_email, subject, status, error=None):
    if db is None:
        return
    from datetime import datetime, timezone
    import asyncio
    async def _insert():
        try:
            await db.email_queue.insert_one({
                "to": to_email, "subject": subject,
                "status": status, "error": error,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception:
            pass
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_insert())
    except Exception:
        pass

# ── Convenience senders ────────────────────────────────────────────────────────

async def send_welcome(to_email: str, name: str, role: str, db=None):
    subj, html = welcome_email(name, role)
    await send_email(to_email, subj, html, db)

async def send_new_order(seller_email: str, seller_name: str, buyer_name: str,
                         gig_title: str, tier: str, price: float, order_id: str, db=None):
    subj, html = new_order_email(seller_name, buyer_name, gig_title, tier, price, order_id)
    await send_email(seller_email, subj, html, db)

async def send_escrow_released(seller_email: str, seller_name: str, gig_title: str,
                                gross: float, net: float, fee: float, fee_pct: float,
                                tier_name: str, order_id: str, db=None):
    subj, html = escrow_released_email(seller_name, gig_title, gross, net, fee, fee_pct, tier_name, order_id)
    await send_email(seller_email, subj, html, db)
