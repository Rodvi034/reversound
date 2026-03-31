"""
AI Content Moderation Service
Multi-layer moderation: Regex patterns + keyword matching + AI scoring.
Gig titles, descriptions, and uploaded content are checked before publishing.
"""
import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# ── Tier 1: BLOCKED — Extreme content that is always rejected ──────────────────
BLOCKED_PATTERNS = [
    # Child safety
    (r'\b(child|minor|underage)\s*(porn|sex|nude|explicit|sexy)\b', 'CHILD_SAFETY'),
    # Illegal weapons/violence
    (r'\b(how\s+to\s+make|build|manufacture)\s*(bomb|explosive|weapon|gun)\b', 'ILLEGAL_VIOLENCE'),
    # Hard drug dealing
    (r'\b(sell|buy|deal)\s*(heroin|fentanyl|crystal\s*meth|crack)\b', 'ILLEGAL_DRUGS'),
    # Hate speech (severe)
    (r'\b(kill\s+all|genocide|ethnic\s+cleansing|death\s+to)\b', 'HATE_SPEECH'),
    # Fraud
    (r'\b(stolen\s+beat|ripped\s+from|not\s+my\s+beat|sample\s+without|copyright\s+violation)\b', 'COPYRIGHT_FRAUD'),
]

# ── Tier 2: FLAGGED — Moderate content sent to admin review queue ──────────────
FLAGGED_PATTERNS = [
    (r'\b(fuck|shit|bitch|motherfucker|asshole)\b', 'MODERATE_PROFANITY'),
    (r'\b(orospu|amk|göt|sik|piç)\b', 'TR_PROFANITY'),
    (r'\b(free\s+download|pirate|crack|keygen)\b', 'PIRACY_SIGNAL'),
    (r'\b(escort|cam\s+girl|adult\s+content|18\+\s*only|xxx)\b', 'ADULT_CONTENT'),
    (r'(?i)(telegram|whatsapp|instagram)\s*[@:]\s*\w+', 'CONTACT_SHARING'),
    (r'https?://(?!reversound\.com)\S+', 'EXTERNAL_URL'),
    # Spam patterns
    (r'(.)\1{6,}', 'EXCESSIVE_REPETITION'),
    (r'[A-Z]{15,}', 'EXCESSIVE_CAPS'),
]

# ── Tier 3: Allowed with note — minor content ─────────────────────────────────
ALLOWED_WITH_NOTE = [
    (r'\b(sex|sexy|adult|mature)\b', 'MATURE_CONTENT_NOTE'),
    (r'\b(drug|weed|cannabis|420|trap\s+life)\b', 'DRUG_REFERENCE_MILD'),
    (r'\b(blood|death|kill|murder)\b', 'DARK_THEME'),  # Common in rap music
]


def moderate_text(text: str, context: str = "general") -> dict:
    """
    Analyze text for policy violations.
    
    Args:
        text: Content to moderate
        context: 'gig_title' | 'gig_description' | 'beat_title' | 'message' | 'general'
    
    Returns:
        {
            "verdict": "OK" | "FLAGGED" | "BLOCKED",
            "severity": "none" | "moderate" | "severe",
            "reason": str,
            "category": str,
            "action": "allow" | "queue_review" | "reject"
        }
    """
    text_lower = text.lower().strip()

    if not text_lower:
        return {"verdict": "OK", "severity": "none", "reason": "", "category": "", "action": "allow"}

    # Tier 1: Always block
    for pattern, category in BLOCKED_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            logger.warning(f"Content BLOCKED [{category}]: {text[:50]}")
            return {
                "verdict": "BLOCKED",
                "severity": "severe",
                "reason": f"Bu içerik platform politikasını ihlal ediyor ({category}). Yayınlanamaz.",
                "category": category,
                "action": "reject"
            }

    # Tier 2: Flag for review (strict contexts)
    strict_contexts = {"gig_title", "gig_description", "beat_title"}
    for pattern, category in FLAGGED_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            if context in strict_contexts:
                logger.info(f"Content FLAGGED [{category}]: {text[:50]}")
                return {
                    "verdict": "FLAGGED",
                    "severity": "moderate",
                    "reason": f"İçerik inceleme kuyruğuna alındı ({category}). Admin onayından sonra yayınlanacak.",
                    "category": category,
                    "action": "queue_review"
                }
            # In less strict contexts (messages, feed), just warn
            return {
                "verdict": "FLAGGED",
                "severity": "low",
                "reason": f"İçerik uyarı aldı ({category}).",
                "category": category,
                "action": "allow"
            }

    # Tier 3: Dark themes are common in music — allow but note
    for pattern, category in ALLOWED_WITH_NOTE:
        if re.search(pattern, text_lower, re.IGNORECASE) and context == "gig_title":
            return {
                "verdict": "OK",
                "severity": "none",
                "reason": f"Müzik tematiği içeriği — izin verildi ({category})",
                "category": category,
                "action": "allow"
            }

    return {"verdict": "OK", "severity": "none", "reason": "", "category": "", "action": "allow"}


def moderate_file_metadata(filename: str, file_size_mb: float, content_type: str) -> dict:
    """Basic file metadata moderation."""
    # Block obviously wrong file types
    disallowed_extensions = {'.exe', '.bat', '.sh', '.cmd', '.ps1', '.php', '.py', '.js'}
    ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if ext in disallowed_extensions:
        return {"verdict": "BLOCKED", "reason": f"Disallowed file type: {ext}", "action": "reject"}

    if file_size_mb > 500:
        return {"verdict": "BLOCKED", "reason": "File too large (max 500MB)", "action": "reject"}

    return {"verdict": "OK", "reason": "", "action": "allow"}


def batch_moderate(fields: dict, context: str = "gig_description") -> dict:
    """
    Moderate multiple text fields at once.
    fields = {"title": "...", "description": "...", "tags": [...]}
    Returns first violation found, or OK.
    """
    for field_name, value in fields.items():
        if not value:
            continue
        text = " ".join(value) if isinstance(value, list) else str(value)
        field_ctx = "gig_title" if "title" in field_name else context
        result = moderate_text(text, field_ctx)
        if result["verdict"] != "OK":
            result["field"] = field_name
            return result
    return {"verdict": "OK", "severity": "none", "reason": "", "category": "", "action": "allow"}
