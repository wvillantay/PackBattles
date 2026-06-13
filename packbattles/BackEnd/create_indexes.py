#!/usr/bin/env python3
"""
create_indexes.py — One-time MongoDB index setup for PackBattles.

Run once after initial setup or after a fresh deployment:

    cd packbattles/BackEnd
    python create_indexes.py

Safe to re-run: create_index is idempotent — calling it again on an identical
index is a no-op. Unique indexes are preceded by a duplicate check that aborts
cleanly if conflicting data exists, so the DB is never left half-indexed.
"""

import os
import sys

import pymongo
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print("ERROR: MONGO_URI not set. Create BackEnd/.env — see .env.example.")
    sys.exit(1)

client = pymongo.MongoClient(MONGO_URI)

try:
    db = client.get_default_database()
except pymongo.errors.ConfigurationError:
    print("ERROR: MONGO_URI does not specify a database name.")
    print("       Expected:  ...mongodb.net/packbattles?...")
    client.close()
    sys.exit(1)

print(f"Connected: {db.name}\n")


# ── Duplicate pre-flight checks ───────────────────────────────────────────────
# Must pass before any unique index is created.

print("Checking for duplicates before creating unique indexes...")

email_dupes = list(db.users.aggregate([
    {"$group": {"_id": "$email", "count": {"$sum": 1}}},
    {"$match": {"count": {"$gt": 1}}},
    {"$sort":  {"count": -1}},
]))

inv_dupes = list(db.inventory.aggregate([
    {"$group": {
        "_id":   {"user_id": "$user_id", "card_id": "$card_id"},
        "count": {"$sum": 1},
    }},
    {"$match": {"count": {"$gt": 1}}},
    {"$sort":  {"count": -1}},
]))

if email_dupes:
    print(f"\n  DUPLICATE USER EMAILS ({len(email_dupes)} group(s)):")
    for d in email_dupes:
        print(f"    email={d['_id']}  appears {d['count']} times")

if inv_dupes:
    print(f"\n  DUPLICATE INVENTORY PAIRS ({len(inv_dupes)} group(s)):")
    for d in inv_dupes:
        print(
            f"    user_id={d['_id']['user_id']}"
            f"  card_id={d['_id']['card_id']}"
            f"  appears {d['count']} times"
        )

if email_dupes or inv_dupes:
    print("\nAborted. Resolve the duplicates listed above, then re-run this script.\n")
    client.close()
    sys.exit(1)

print("  No duplicates found.\n")


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_index(collection, keys, name, unique=False):
    """
    Create one index and log the outcome.

    create_index is idempotent: if an identical index already exists,
    MongoDB returns its name immediately with no error. An OperationFailure
    only occurs if the name or key spec conflicts with a different existing
    index, which requires manual Atlas/Compass intervention.
    """
    try:
        collection.create_index(keys, name=name, unique=unique)
        print(f"  OK    {collection.name}  [{name}]")
    except pymongo.errors.OperationFailure as exc:
        # 85 = IndexKeySpecsConflict  86 = IndexOptionsConflict
        if exc.code in (85, 86) or "already exists" in str(exc):
            print(
                f"  SKIP  {collection.name}  [{name}]"
                f"  — conflicting index exists; review manually in Atlas"
            )
        else:
            print(f"  ERR   {collection.name}  [{name}]: {exc}")
            client.close()
            raise


# ── Index definitions ─────────────────────────────────────────────────────────

print("Creating indexes...\n")

# users — unique email (login lookup + signup uniqueness guarantee)
make_index(
    db.users,
    [("email", pymongo.ASCENDING)],
    name="users_email_unique",
    unique=True,
)

# inventory — unique (user_id, card_id) pair (upsert correctness + lookup speed)
make_index(
    db.inventory,
    [("user_id", pymongo.ASCENDING), ("card_id", pymongo.ASCENDING)],
    name="inv_user_card_unique",
    unique=True,
)

# battles — open-battles list page: filter status + sort newest first
make_index(
    db.battles,
    [("status", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
    name="battles_status_created",
)

# battles — user battle history (my_battles uses $or across both fields)
make_index(
    db.battles,
    [("creator_id", pymongo.ASCENDING)],
    name="battles_creator_id",
)
make_index(
    db.battles,
    [("opponent_id", pymongo.ASCENDING)],
    name="battles_opponent_id",
)

# credit_transactions — profile credit history: filter by user + sort newest first
make_index(
    db.credit_transactions,
    [("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
    name="txns_user_created",
)

# company_inventory — one record per card; used by exchange eligible lookup and confirm
make_index(
    db.company_inventory,
    [("card_id", pymongo.ASCENDING)],
    name="company_inv_card_id_unique",
    unique=True,
)

# exchange_log — queried by user and sorted by date
make_index(
    db.exchange_log,
    [("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
    name="exchange_log_user_created",
)

print("\nAll indexes created successfully.\n")
client.close()
