"""
migrate_card_schema.py
======================
Adds Phase-1 pricing/provider fields to every document in the `cards`
collection that does not already have them.

Idempotent — safe to re-run. Uses `{field: {"$exists": False}}` filters so
existing values (including market_price, price_source, value) are never
touched.

Run from the BackEnd directory:
    python migrate_card_schema.py
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise SystemExit("MONGO_URI not set. Check BackEnd/.env.")

DB_NAME = "packbattles"

# ── Fields and their defaults ─────────────────────────────────────────────
#
# Each tuple is (field_name, default_value).
# Only applied to documents where the field does not already exist.
# "provider" defaults to "manual" for all pre-existing hand-seeded cards.
# "active"   defaults to True.

SCALAR_DEFAULTS = [
    ("provider",              "manual"),
    ("provider_card_id",      None),
    ("tcgplayer_price_usd",   None),
    ("cardmarket_price_eur",  None),
    ("market_price_currency", None),
    ("last_price_update",     None),
    ("set_name",              None),
    ("set_code",              None),
    ("set_series",            None),
    ("set_release_date",      None),
    ("admin_price_override",  None),
    ("admin_override_note",   None),
    ("admin_override_at",     None),
    ("active",                True),
]


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except ConnectionFailure:
        print("ERROR: Cannot connect to MongoDB. Check MONGO_URI in .env.")
        raise SystemExit(1)
    return client[DB_NAME]


def migrate(db):
    total = db.cards.count_documents({})
    print(f"cards collection: {total} document(s) found")

    modified_any = False

    # ── Scalar / None / bool fields ───────────────────────────────────────
    for field, default in SCALAR_DEFAULTS:
        result = db.cards.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
        if result.modified_count:
            modified_any = True
            print(f"  {field:<25} → added default on {result.modified_count} doc(s)")

    # ── updated_at — use a real timestamp, not None ───────────────────────
    now    = datetime.now(timezone.utc)
    result = db.cards.update_many(
        {"updated_at": {"$exists": False}},
        {"$set": {"updated_at": now}},
    )
    if result.modified_count:
        modified_any = True
        print(f"  {'updated_at':<25} → set to now on {result.modified_count} doc(s)")

    if not modified_any:
        print("  All fields already present — nothing to update.")

    print()
    print("Migration complete. Re-running is safe — no existing values were overwritten.")


if __name__ == "__main__":
    print()
    print("=" * 55)
    print("  PackBattles — Card Schema Migration (Phase 1)")
    print("=" * 55)
    print()
    db = get_db()
    migrate(db)
    print()
