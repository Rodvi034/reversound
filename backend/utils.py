from bson import ObjectId
from datetime import datetime
import re

def doc_to_dict(doc: dict) -> dict:
    if not doc:
        return {}
    result = {}
    for k, v in doc.items():
        if k == '_id':
            result['id'] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = doc_to_dict(v)
        elif isinstance(v, list):
            result[k] = [
                doc_to_dict(i) if isinstance(i, dict)
                else str(i) if isinstance(i, ObjectId)
                else i
                for i in v
            ]
        else:
            result[k] = v
    return result

def docs_to_list(docs) -> list:
    return [doc_to_dict(doc) for doc in docs]

# ── Message Moderation ─────────────────────────────────────────────────────────
MODERATION_PATTERNS = [
    # NOTE: emails and phone numbers are now handled by soft DLP (mask_sensitive_content)
    # Only extreme/spam content that warrants hard blocking remains here
    (r'https?://\S+|www\.\S+', 'external URL'),
    (r'(?<!\w)@[A-Za-z0-9_.]{2,}', 'social media handle'),
]

def moderate_message(text: str):
    for pattern, reason in MODERATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True, f"Message blocked: contains {reason}. All communication must stay on ReverSound for your protection."
    return False, ""

def mask_sensitive_content(text: str) -> tuple[str, bool, str]:
    """
    DLP: Mask sensitive contact info in chat messages instead of blocking.
    Messages are delivered but sensitive data is replaced with placeholders.
    """
    import re as _re
    masked = text
    had_sensitive = False

    # Mask emails
    if _re.search(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', masked, _re.IGNORECASE):
        masked = _re.sub(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', '[E-POSTA GİZLENDİ]', masked, flags=_re.IGNORECASE)
        had_sensitive = True

    # Mask Turkish phone numbers (various formats)
    phone_patterns = [
        r'(\+?90|0)[\s\-\.]?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2}',
        r'\b0\d{10}\b',
        r'\+90\d{10}\b',
        r'\b5\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b',
    ]
    for pp in phone_patterns:
        if _re.search(pp, masked, _re.IGNORECASE):
            masked = _re.sub(pp, '[TELEFON GİZLENDİ]', masked, flags=_re.IGNORECASE)
            had_sensitive = True

    # Mask social handles with platform names
    social_pattern = r'(?i)(instagram|telegram|whatsapp|snapchat|discord|signal|facebook|twitter|tiktok)[\s:@./]+[\w.]+'
    if _re.search(social_pattern, masked, _re.IGNORECASE):
        masked = _re.sub(social_pattern, '[SOSYAL MEDYA GİZLENDİ]', masked, flags=_re.IGNORECASE)
        had_sensitive = True

    # Mask external URLs (not reversound.com)
    ext_url = r'https?://(?!reversound\.com)\S+'
    if _re.search(ext_url, masked, _re.IGNORECASE):
        masked = _re.sub(ext_url, '[LİNK GİZLENDİ]', masked, flags=_re.IGNORECASE)
        had_sensitive = True

    reason = "İletişim bilgisi gizlendi — güvenliğiniz için tüm görüşmeleri platform üzerinde tutun." if had_sensitive else ""
    return masked, had_sensitive, reason

# ── Feed / Post Moderation ──────────────────────────────────────────────────────
PROFANITY_LIST = [
    "spam", "scam", "hack", "free money", "click here",
    "amk", "orospu", "siktir", "piç", "göt",
]

SPAM_PATTERNS = [
    (r'https?://\S+', 'external URL (not allowed in feed)'),
    (r'(?i)(follow me|dm me|contact me|my ig|my insta|my discord|join my|check my)', 'self-promotion'),
    (r'(.)\1{5,}', 'repeated characters (spam)'),
    (r'[A-Z]{10,}', 'excessive caps'),
]

def moderate_post(text: str):
    text_lower = text.lower()
    for word in PROFANITY_LIST:
        if word in text_lower:
            return True, f"Post contains prohibited content: '{word}'"
    for pattern, reason in SPAM_PATTERNS:
        if re.search(pattern, text):
            return True, f"Post blocked: {reason}"
    return False, ""
