"""
Dynamic Commission Engine — Revenue Share Program.
Tiers based on producer's lifetime completed gig sales:
  Starter (0-10): 10% platform fee
  Pro (11-50):    7.5% platform fee
  Elite (51+):    5% platform fee
"""
from typing import Optional

LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png"

COMMISSION_TIERS = [
    {"name": "Elite",   "threshold": 51, "fee": 0.05,  "color": "#ec4899", "badge": "ELITE",   "next_threshold": None},
    {"name": "Pro",     "threshold": 11, "fee": 0.075, "color": "#8b5cf6", "badge": "PRO",     "next_threshold": 51},
    {"name": "Starter", "threshold": 0,  "fee": 0.10,  "color": "#a1a1aa", "badge": "STARTER", "next_threshold": 11},
]

def get_tier(lifetime_gig_sales: int) -> dict:
    """Return the commission tier for a given lifetime sales count."""
    for tier in COMMISSION_TIERS:
        if lifetime_gig_sales >= tier["threshold"]:
            return tier
    return COMMISSION_TIERS[-1]

def get_commission_fee(lifetime_gig_sales: int) -> float:
    """Return the platform commission rate (0.05 – 0.10)."""
    return get_tier(lifetime_gig_sales)["fee"]

def get_seller_share(lifetime_gig_sales: int) -> float:
    """Return seller's share (1 - commission)."""
    return 1.0 - get_commission_fee(lifetime_gig_sales)

def get_tier_progress(lifetime_gig_sales: int) -> dict:
    """Return tier info + progress toward next tier."""
    current = get_tier(lifetime_gig_sales)
    next_threshold = current.get("next_threshold")

    if next_threshold is None:
        # Already at Elite
        return {
            "current_tier": current,
            "next_tier": None,
            "sales_to_next": 0,
            "progress_pct": 100,
            "lifetime_gig_sales": lifetime_gig_sales,
        }

    # Find next tier
    next_tier = next((t for t in COMMISSION_TIERS if t["threshold"] == next_threshold), None)
    start = current["threshold"]
    sales_in_tier = lifetime_gig_sales - start
    tier_range = next_threshold - start
    progress_pct = min(int((sales_in_tier / tier_range) * 100), 99)

    return {
        "current_tier": current,
        "next_tier": next_tier,
        "sales_to_next": max(next_threshold - lifetime_gig_sales, 0),
        "progress_pct": progress_pct,
        "lifetime_gig_sales": lifetime_gig_sales,
    }

async def get_seller_lifetime_sales(db, seller_id: str) -> int:
    """Count lifetime completed gig sales for a seller."""
    # Use cached value from user document if available
    user = await db.users.find_one({"_id": __import__("bson").ObjectId(seller_id)}, {"lifetime_gig_sales": 1})
    if user and "lifetime_gig_sales" in user:
        return user.get("lifetime_gig_sales", 0)
    # Fallback: count from orders
    count = await db.orders.count_documents({"seller_id": seller_id, "status": "completed"})
    return count

async def increment_lifetime_sales(db, seller_id: str) -> int:
    """Increment seller's lifetime_gig_sales counter and return new value."""
    result = await db.users.find_one_and_update(
        {"_id": __import__("bson").ObjectId(seller_id)},
        {"$inc": {"lifetime_gig_sales": 1}},
        return_document=True,
        projection={"lifetime_gig_sales": 1}
    )
    return result.get("lifetime_gig_sales", 1) if result else 1
