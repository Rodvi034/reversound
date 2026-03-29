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
    (r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', 'email address'),
    (r'(\+?90|0)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}', 'phone number'),
    (r'https?://\S+|www\.\S+', 'external URL'),
    (r'(?i)(instagram|telegram|whatsapp|snapchat|twitter|tiktok|discord|facebook|signal)[\s:@./]+\w+', 'social media contact'),
    (r'(?<!\w)@[A-Za-z0-9_.]{2,}', 'social media handle'),
    (r'\b\d{10,11}\b', 'phone number'),
]

def moderate_message(text: str):
    for pattern, reason in MODERATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True, f"Message blocked: contains {reason}. All communication must stay on ReverSound for your protection."
    return False, ""

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
