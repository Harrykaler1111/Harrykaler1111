"""
Unified Sequential Display ID System
Generates human-readable IDs like VND-0001, RSL-0001, etc.
Uses MongoDB counters collection for atomic sequential generation.
"""

from config import db

# Role → prefix mapping
ROLE_PREFIXES = {
    "vendor": "VND",
    "reseller": "RSL",
    "influencer": "INF",
    "affiliate": "AFF",
    "admin": "ADM",
    "manager": "MGR",
    "promotion": "PRM",
    "credit_txn": "CRD",
    "issue": "ISS",
    "order": "ORD",
    "product": "PRD",
}

# Padding per type (admins/managers use 3 digits, others 4)
PADDING = {
    "admin": 3,
    "manager": 3,
}
DEFAULT_PADDING = 4


async def generate_display_id(role: str) -> str:
    """
    Atomically increments the counter for the given role and returns
    a sequential display ID like VND-0001, ADM-001, etc.
    """
    prefix = ROLE_PREFIXES.get(role, role.upper()[:3])
    pad = PADDING.get(role, DEFAULT_PADDING)

    result = await db.id_counters.find_one_and_update(
        {"_id": role},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True  # returns the document AFTER update
    )
    seq = result["seq"]
    return f"{prefix}-{str(seq).zfill(pad)}"


async def migrate_existing_users():
    """
    Assigns display_ids to all existing users that don't have one.
    Safe to run multiple times (idempotent).
    Returns count of migrated records per role.
    """
    stats = {}

    role_configs = [
        ("vendors", "vendor_id", "vendor"),
        ("resellers", "reseller_id", "reseller"),
        ("affiliates", "affiliate_id", "affiliate"),
        ("influencers", "influencer_id", "influencer"),
        ("admin_users", "admin_id", "admin"),
    ]

    for collection, id_field, role in role_configs:
        cursor = db[collection].find(
            {"display_id": {"$exists": False}},
            {"_id": 0, id_field: 1}
        )
        count = 0
        async for doc in cursor:
            display_id = await generate_display_id(role)
            await db[collection].update_one(
                {id_field: doc[id_field]},
                {"$set": {"display_id": display_id}}
            )
            count += 1
        stats[role] = count

    # Migrate support tickets → ISS-XXXX
    cursor = db.support_tickets.find(
        {"display_id": {"$exists": False}},
        {"_id": 0, "ticket_id": 1}
    )
    count = 0
    async for doc in cursor:
        display_id = await generate_display_id("issue")
        await db.support_tickets.update_one(
            {"ticket_id": doc["ticket_id"]},
            {"$set": {"display_id": display_id}}
        )
        count += 1
    stats["issue"] = count

    # Migrate promotion requests → PRM-XXXX
    cursor = db.promotion_requests.find(
        {"display_id": {"$exists": False}},
        {"_id": 0, "request_id": 1}
    )
    count = 0
    async for doc in cursor:
        display_id = await generate_display_id("promotion")
        await db.promotion_requests.update_one(
            {"request_id": doc["request_id"]},
            {"$set": {"display_id": display_id}}
        )
        count += 1
    stats["promotion"] = count

    # Migrate credit transactions → CRD-XXXX
    cursor = db.credit_transactions.find(
        {"display_id": {"$exists": False}, "txn_id": {"$exists": True}},
        {"_id": 0, "txn_id": 1}
    )
    count = 0
    async for doc in cursor:
        display_id = await generate_display_id("credit_txn")
        await db.credit_transactions.update_one(
            {"txn_id": doc["txn_id"]},
            {"$set": {"display_id": display_id}}
        )
        count += 1
    stats["credit_txn"] = count

    # Create indexes for fast lookup
    await db.vendors.create_index("display_id", sparse=True)
    await db.resellers.create_index("display_id", sparse=True)
    await db.affiliates.create_index("display_id", sparse=True)
    await db.influencers.create_index("display_id", sparse=True)
    await db.admin_users.create_index("display_id", sparse=True)
    await db.support_tickets.create_index("display_id", sparse=True)
    await db.promotion_requests.create_index("display_id", sparse=True)
    await db.credit_transactions.create_index("display_id", sparse=True)

    return stats
