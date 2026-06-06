"""
PackBattles — Database seed script
===================================
Populates: cards, packs
Does NOT touch: users, inventory, battles (created by the app)

Run once before starting the server:
    python seed.py

Safe to re-run. Drops and recreates cards and packs on every run.

Card design
-----------
All 20 cards are Pokemon test cards using existing placeholder images
from Frontend/public/imgs/. Real card names and TCGplayer/PokemonTCG
prices can be swapped in later by updating the card documents in
MongoDB — no application code changes required.

Fields designed for future API integration
------------------------------------------
  market_price  float | None   Real-world USD price. None until fetched
                               from TCGplayer or PokemonTCG API.
  price_source  str            Where the price came from.
                               "manual"     = developer-set placeholder
                               "tcgplayer"  = fetched from TCGplayer API (future)
                               "pokemontcg" = fetched from PokemonTCG API (future)
  value         float          In-game credit value. Used for battle
                               comparisons and pack cost calculations.
                               Can be linked to market_price later
                               (e.g. value = market_price * 10) but
                               is intentionally independent for now.
"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise SystemExit(
        "MONGO_URI not set. "
        "Create packbattles/BackEnd/.env — see TEST_CONNECTION.md."
    )

DB_NAME = "packbattles"


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except ConnectionFailure:
        print("ERROR: Cannot connect to MongoDB.")
        print("  Check that MONGO_URI in .env is correct.")
        print("  For Atlas: confirm your IP is in the Atlas IP Allow List.")
        raise SystemExit(1)
    return client[DB_NAME]


# ---------------------------------------------------------------------------
# Card definitions
# ---------------------------------------------------------------------------
#
# Rarity tiers and value ranges (in credits):
#   common      7 – 15
#   uncommon   35 – 65
#   rare      130 – 200
#   ultra_rare 350 – 500
#
# Images: existing placeholder art from Frontend/public/imgs/
#   Cards  1–13  →  /imgs/image 29.png  …  /imgs/image 29 (12).png
#   Cards 14–20  →  /imgs/image 30.png  …  /imgs/image 30 (6).png
#
# To replace with real data later:
#   1. Run a TCGplayer/PokemonTCG fetch script
#   2. Update each document's name, image_url, market_price, price_source
#   3. No application code changes needed — the fields already exist

CARDS = [
    # ── Common (8 cards, value 7–15) ────────────────────────────────────
    {
        "name":         "Pokemon Test Card 1",
        "image_url":    "/imgs/image 29.png",
        "rarity":       "common",
        "value":        10.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 2",
        "image_url":    "/imgs/image 29 (1).png",
        "rarity":       "common",
        "value":        8.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 3",
        "image_url":    "/imgs/image 29 (2).png",
        "rarity":       "common",
        "value":        12.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 4",
        "image_url":    "/imgs/image 29 (3).png",
        "rarity":       "common",
        "value":        9.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 5",
        "image_url":    "/imgs/image 29 (4).png",
        "rarity":       "common",
        "value":        11.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 6",
        "image_url":    "/imgs/image 29 (5).png",
        "rarity":       "common",
        "value":        15.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 7",
        "image_url":    "/imgs/image 29 (6).png",
        "rarity":       "common",
        "value":        13.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 8",
        "image_url":    "/imgs/image 29 (7).png",
        "rarity":       "common",
        "value":        7.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    # ── Uncommon (6 cards, value 35–65) ─────────────────────────────────
    {
        "name":         "Pokemon Test Card 9",
        "image_url":    "/imgs/image 29 (8).png",
        "rarity":       "uncommon",
        "value":        45.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 10",
        "image_url":    "/imgs/image 29 (9).png",
        "rarity":       "uncommon",
        "value":        55.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 11",
        "image_url":    "/imgs/image 29 (10).png",
        "rarity":       "uncommon",
        "value":        40.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 12",
        "image_url":    "/imgs/image 29 (11).png",
        "rarity":       "uncommon",
        "value":        60.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 13",
        "image_url":    "/imgs/image 29 (12).png",
        "rarity":       "uncommon",
        "value":        50.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 14",
        "image_url":    "/imgs/image 30.png",
        "rarity":       "uncommon",
        "value":        35.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    # ── Rare (4 cards, value 130–200) ───────────────────────────────────
    {
        "name":         "Pokemon Test Card 15",
        "image_url":    "/imgs/image 30 (1).png",
        "rarity":       "rare",
        "value":        130.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 16",
        "image_url":    "/imgs/image 30 (2).png",
        "rarity":       "rare",
        "value":        180.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 17",
        "image_url":    "/imgs/image 30 (3).png",
        "rarity":       "rare",
        "value":        150.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 18",
        "image_url":    "/imgs/image 30 (4).png",
        "rarity":       "rare",
        "value":        200.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    # ── Ultra Rare (2 cards, value 350–500) ─────────────────────────────
    {
        "name":         "Pokemon Test Card 19",
        "image_url":    "/imgs/image 30 (5).png",
        "rarity":       "ultra_rare",
        "value":        350.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
    {
        "name":         "Pokemon Test Card 20",
        "image_url":    "/imgs/image 30 (6).png",
        "rarity":       "ultra_rare",
        "value":        500.00,
        "market_price": None,
        "price_source": "manual",
        "game":         "Pokemon",
    },
]


# ---------------------------------------------------------------------------
# Pack definitions
# ---------------------------------------------------------------------------
#
# Three test packs, all Pokemon-only.
# Weights do not need to sum to any specific number.
# P(card selected) = card.weight / sum(all weights in pool)
#
# Pack A  — common-heavy, cheapest entry point
# Pack B  — balanced across all rarities
# Pack C  — rare-heavy, highest cost

def build_packs(card_map):
    return [
        {
            "name":           "Test Pack Alpha",
            "image_url":      "/imgs/karte1 2.png",
            "cost":           100,
            "cards_per_open": 5,
            "pool": [
                # commons  (high weight)
                {"card_id": card_map["Pokemon Test Card 1"],  "weight": 18},
                {"card_id": card_map["Pokemon Test Card 2"],  "weight": 18},
                {"card_id": card_map["Pokemon Test Card 3"],  "weight": 18},
                {"card_id": card_map["Pokemon Test Card 4"],  "weight": 16},
                {"card_id": card_map["Pokemon Test Card 5"],  "weight": 16},
                {"card_id": card_map["Pokemon Test Card 6"],  "weight": 14},
                {"card_id": card_map["Pokemon Test Card 7"],  "weight": 14},
                {"card_id": card_map["Pokemon Test Card 8"],  "weight": 14},
                # uncommons (medium weight)
                {"card_id": card_map["Pokemon Test Card 9"],  "weight": 5},
                {"card_id": card_map["Pokemon Test Card 10"], "weight": 5},
                {"card_id": card_map["Pokemon Test Card 11"], "weight": 5},
                # rare (low weight)
                {"card_id": card_map["Pokemon Test Card 15"], "weight": 2},
                # ultra rare (very low)
                {"card_id": card_map["Pokemon Test Card 19"], "weight": 1},
            ],
        },
        {
            "name":           "Test Pack Beta",
            "image_url":      "/imgs/karte1 2 (1).png",
            "cost":           150,
            "cards_per_open": 5,
            "pool": [
                # commons
                {"card_id": card_map["Pokemon Test Card 1"],  "weight": 10},
                {"card_id": card_map["Pokemon Test Card 2"],  "weight": 10},
                {"card_id": card_map["Pokemon Test Card 3"],  "weight": 10},
                {"card_id": card_map["Pokemon Test Card 4"],  "weight": 8},
                # uncommons
                {"card_id": card_map["Pokemon Test Card 9"],  "weight": 12},
                {"card_id": card_map["Pokemon Test Card 10"], "weight": 12},
                {"card_id": card_map["Pokemon Test Card 11"], "weight": 12},
                {"card_id": card_map["Pokemon Test Card 12"], "weight": 10},
                {"card_id": card_map["Pokemon Test Card 13"], "weight": 10},
                # rares
                {"card_id": card_map["Pokemon Test Card 15"], "weight": 6},
                {"card_id": card_map["Pokemon Test Card 16"], "weight": 6},
                {"card_id": card_map["Pokemon Test Card 17"], "weight": 4},
                # ultra rares
                {"card_id": card_map["Pokemon Test Card 19"], "weight": 3},
                {"card_id": card_map["Pokemon Test Card 20"], "weight": 2},
            ],
        },
        {
            "name":           "Test Pack Gamma",
            "image_url":      "/imgs/karte1 2 (2).png",
            "cost":           200,
            "cards_per_open": 5,
            "pool": [
                # commons (minimal)
                {"card_id": card_map["Pokemon Test Card 5"],  "weight": 6},
                {"card_id": card_map["Pokemon Test Card 6"],  "weight": 6},
                # uncommons
                {"card_id": card_map["Pokemon Test Card 9"],  "weight": 10},
                {"card_id": card_map["Pokemon Test Card 10"], "weight": 10},
                {"card_id": card_map["Pokemon Test Card 12"], "weight": 10},
                {"card_id": card_map["Pokemon Test Card 14"], "weight": 8},
                # rares (heavy)
                {"card_id": card_map["Pokemon Test Card 15"], "weight": 14},
                {"card_id": card_map["Pokemon Test Card 16"], "weight": 14},
                {"card_id": card_map["Pokemon Test Card 17"], "weight": 12},
                {"card_id": card_map["Pokemon Test Card 18"], "weight": 12},
                # ultra rares (meaningful chance)
                {"card_id": card_map["Pokemon Test Card 19"], "weight": 8},
                {"card_id": card_map["Pokemon Test Card 20"], "weight": 8},
            ],
        },
    ]


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------

def ensure_indexes(db):
    print("Ensuring indexes...")

    db.users.create_index(
        "email", unique=True, name="email_unique"
    )

    db.cards.create_index("rarity",       name="rarity_idx")
    db.cards.create_index("game",         name="game_idx")
    db.cards.create_index("price_source", name="price_source_idx")

    db.inventory.create_index("user_id", name="user_inventory_idx")
    db.inventory.create_index(
        [("user_id", ASCENDING), ("card_id", ASCENDING)],
        unique=True,
        name="user_card_unique",
    )

    db.battles.create_index("status", name="status_idx")
    db.battles.create_index(
        [("creator_id", ASCENDING), ("status", ASCENDING)],
        name="creator_open_idx",
    )
    db.battles.create_index(
        [("pack_id", ASCENDING), ("status", ASCENDING)],
        name="pack_status_idx",
    )

    print("  All indexes ready")


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed_cards(db):
    print("Seeding cards (20 Pokemon test cards)...")
    db.cards.drop()
    result  = db.cards.insert_many(CARDS)
    ids     = result.inserted_ids
    print(f"  Inserted {len(ids)} cards")

    # Return name → ObjectId lookup used by seed_packs
    return {card["name"]: ids[i] for i, card in enumerate(CARDS)}


def seed_packs(db, card_map):
    print("Seeding packs (3 test packs)...")
    db.packs.drop()
    packs  = build_packs(card_map)
    result = db.packs.insert_many(packs)
    print(f"  Inserted {len(result.inserted_ids)} packs")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    print()
    print("=" * 55)
    print("  PackBattles — Database Seed")
    print("=" * 55)

    db       = get_db()
    card_map = seed_cards(db)
    seed_packs(db, card_map)
    ensure_indexes(db)

    print()
    print("Summary:")
    print(f"  users:     {db.users.count_documents({}):>4}  (untouched)")
    print(f"  cards:     {db.cards.count_documents({}):>4}")
    print(f"  packs:     {db.packs.count_documents({}):>4}")
    print(f"  inventory: {db.inventory.count_documents({}):>4}  (untouched)")
    print(f"  battles:   {db.battles.count_documents({}):>4}  (untouched)")
    print()

    # Spot-check the rarity distribution
    for rarity in ("common", "uncommon", "rare", "ultra_rare"):
        count = db.cards.count_documents({"rarity": rarity})
        print(f"  {rarity:<12} {count} cards")

    print()
    print("Done. Start the Flask server:  python main.py")
    print()


if __name__ == "__main__":
    main()
