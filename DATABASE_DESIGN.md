# PackBattles — Database Design
**Created:** June 6, 2026  
**Reference:** MVP_PLAN.md  
**Database:** MongoDB (local dev) → MongoDB Atlas (production)  
**Database name:** `packbattles`

Verify and approve this design before any code is written.

---

## Collections Overview

| Collection | Purpose | Created by |
|------------|---------|------------|
| `users` | Accounts, credits, win/loss record | App (signup) |
| `cards` | Card definitions — what cards exist | Seed script |
| `packs` | Pack types with weighted card pools | Seed script |
| `inventory` | Cards owned by each user | App (pack opening) |
| `battles` | Battle records, one per game | App (create/join) |

---

## Relationships

```
users ──────────────────────────── inventory
  │   (one user has many entries)      │
  │                                    │
  │   creator_id, opponent_id          card_id
  └──────────── battles ──────── packs
                   │               │
              pack_id ─────────────┘
              (same pack used by both players)

cards ──────────────────────────── inventory
  │   (one card type in many entries)
  │
  └── packs.pool[].card_id
      (cards referenced inside pack pools)

  battles.creator_cards[].card_id ──── cards
  battles.opponent_cards[].card_id ─── cards
      (embedded snapshots — card_id kept for inventory upsert on resolve)
```

**Reference pattern used throughout:** store `ObjectId` references, not embedded documents. Inventory documents store `card_id` (not the whole card object) so card data (name, image, value) is updated in one place.

**Exception — `battles.creator_cards` / `battles.opponent_cards`:** These are embedded arrays of card snapshots `{ card_id, name, image_url, rarity, value }`. The snapshot preserves the exact cards drawn and their values at the time of the battle — permanent audit trail even if card values change later. The `card_id` inside each snapshot is used when the winner's inventory is updated on resolution.

---

## Collection 1: `users`

### Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | MongoDB auto-generated |
| `name` | String | yes | — | Display name |
| `email` | String | yes | — | Must be unique, lowercase |
| `password_hash` | String | yes | — | bcrypt hash, never plaintext |
| `credits` | Int | yes | 300 | Starter balance |
| `wins` | Int | yes | 0 | Total Duel Battle wins |
| `losses` | Int | yes | 0 | Total Duel Battle losses |
| `created_at` | Date | yes | now | UTC timestamp |

### Indexes

| Index | Type | Field(s) | Reason |
|-------|------|----------|--------|
| `email_unique` | Unique | `email` | Duplicate check on signup + lookup on login |

### Example Document

```json
{
  "_id": { "$oid": "666100000000000000000001" },
  "name": "Alex Chen",
  "email": "alex@example.com",
  "password_hash": "$2b$12$LKTgmPDJBtqMFjFNFq4b.uIkKJoH9xFpXz4H7pL5M4jQYEbSxample",
  "credits": 200,
  "wins": 3,
  "losses": 1,
  "created_at": { "$date": "2026-06-01T10:00:00Z" }
}
```

### Validation rules (enforce in application code)
- `email` must match format `x@x.x`
- `email` stored lowercase (convert before insert)
- `password_hash` always set from bcrypt — never accept raw password
- `credits` must never go below 0 (check before any deduction)
- `wins` and `losses` increment only (never decrement)

---

## Collection 2: `cards`

Card definitions. Represents what cards exist in the game world, not what any user owns. Seeded once, rarely changed.

**MVP scope:** 20 Pokemon test cards using existing placeholder images. Real names, images, and market prices can be swapped in via a data migration — no application code changes required.

### Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | MongoDB auto-generated |
| `name` | String | yes | — | Card display name (e.g. "Pokemon Test Card 1") |
| `image_url` | String | yes | — | Path relative to /public, e.g. `/imgs/image 29.png` |
| `rarity` | String | yes | — | Enum: `common`, `uncommon`, `rare`, `ultra_rare` |
| `value` | Double | yes | — | In-game credit value used for battle comparisons and pack cost math |
| `market_price` | Double\|null | yes | null | Real-world USD price. `null` until fetched from TCGplayer or PokemonTCG API |
| `price_source` | String | yes | `"manual"` | Where the price came from. Enum: `manual`, `tcgplayer`, `pokemontcg` |
| `game` | String | yes | — | Enum: `Pokemon` (MVP). `Yugioh`, `Magic`, `Digimon` reserved for post-MVP |

### Field notes: `value` vs `market_price`

| Field | Currency | Source | Used for |
|-------|----------|--------|----------|
| `value` | Credits (in-game) | Set manually by developer | Battle winner determination, pack cost math |
| `market_price` | USD (real-world) | TCGplayer / PokemonTCG API | Display to users, future dynamic pricing |

These are intentionally separate. `value` drives gameplay. `market_price` drives display and future pricing features. When TCGplayer integration ships, a nightly sync script will update `market_price` and `price_source` without touching `value`.

### Indexes

| Index | Type | Field(s) | Reason |
|-------|------|----------|--------|
| `rarity_idx` | Standard | `rarity` | Filter cards by rarity in pack pool queries |
| `game_idx` | Standard | `game` | Filter by game in future search features |
| `price_source_idx` | Standard | `price_source` | Find all cards that still need real price data |

### Example Documents

**Common card (MVP placeholder):**
```json
{
  "_id": { "$oid": "666200000000000000000001" },
  "name": "Pokemon Test Card 1",
  "image_url": "/imgs/image 29.png",
  "rarity": "common",
  "value": 10.00,
  "market_price": null,
  "price_source": "manual",
  "game": "Pokemon"
}
```

**Ultra rare card (MVP placeholder):**
```json
{
  "_id": { "$oid": "666200000000000000000020" },
  "name": "Pokemon Test Card 20",
  "image_url": "/imgs/image 30 (6).png",
  "rarity": "ultra_rare",
  "value": 500.00,
  "market_price": null,
  "price_source": "manual",
  "game": "Pokemon"
}
```

**What a card looks like after TCGplayer integration (future):**
```json
{
  "_id": { "$oid": "666200000000000000000001" },
  "name": "Charizard (Base Set, 4/102)",
  "image_url": "https://images.pokemontcg.io/base1/4_hires.png",
  "rarity": "ultra_rare",
  "value": 500.00,
  "market_price": 350.75,
  "price_source": "tcgplayer",
  "game": "Pokemon"
}
```

### Validation rules
- `value` must be greater than 0
- `market_price` must be greater than 0 if not null
- `rarity` must be exactly one of the four enum values
- `price_source` must be exactly one of: `manual`, `tcgplayer`, `pokemontcg`
- `game` must be one of: `Pokemon`, `Yugioh`, `Magic`, `Digimon`
- `image_url` must start with `/imgs/` (local) or `https://` (CDN, post-MVP)

---

## Collection 3: `packs`

Pack types that users can open. Each pack has a weighted pool of card references. Seeded once, rarely changed.

### Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | MongoDB auto-generated |
| `name` | String | yes | — | Display name |
| `image_url` | String | yes | — | Pack image, relative to /public |
| `cost` | Int | yes | — | Credits required to open |
| `cards_per_open` | Int | yes | — | How many cards granted per open |
| `pool` | Array | yes | — | Array of `{ card_id, weight }` objects |
| `pool[].card_id` | ObjectId | yes | — | Reference to `cards._id` |
| `pool[].weight` | Int | yes | — | Relative probability weight (higher = more likely) |

### Indexes

None required beyond `_id` for MVP. Pack list will be small (3 packs at seed time).

### How Weights Work

Weights do not need to sum to 100 or any specific number. The probability of a card being selected is:

```
P(card) = card.weight / sum(all weights in pool)
```

**Example pool (weights sum to 100 for readability):**

| Card | Rarity | Weight | Probability |
|------|--------|--------|------------|
| Pokemon Test Card 1 | common | 40 | 40% |
| Pokemon Test Card 2 | common | 30 | 30% |
| Pokemon Test Card 9 | uncommon | 20 | 20% |
| Pokemon Test Card 15 | rare | 8 | 8% |
| Pokemon Test Card 19 | ultra_rare | 2 | 2% |

### Example Document

```json
{
  "_id": { "$oid": "666300000000000000000001" },
  "name": "Test Pack Alpha",
  "image_url": "/imgs/karte1 2.png",
  "cost": 100,
  "cards_per_open": 5,
  "pool": [
    { "card_id": { "$oid": "666200000000000000000001" }, "weight": 40 },
    { "card_id": { "$oid": "666200000000000000000002" }, "weight": 35 },
    { "card_id": { "$oid": "666200000000000000000003" }, "weight": 15 },
    { "card_id": { "$oid": "666200000000000000000004" }, "weight": 8 },
    { "card_id": { "$oid": "666200000000000000000005" }, "weight": 2 }
  ]
}
```

### Validation rules
- `cost` must be greater than 0
- `cards_per_open` must be between 1 and 10
- `pool` must contain at least 2 entries
- All `card_id` values in the pool must exist in the `cards` collection
- All `weight` values must be greater than 0

---

## Collection 4: `inventory`

One document per unique user+card combination. Quantity increments when the user receives a duplicate card.

### Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | MongoDB auto-generated |
| `user_id` | ObjectId | yes | — | Reference to `users._id` |
| `card_id` | ObjectId | yes | — | Reference to `cards._id` |
| `quantity` | Int | yes | 1 | Increments on duplicate; never below 1 |
| `acquired_at` | Date | yes | now | When first acquired (not updated on duplicates) |

### Indexes

| Index | Type | Field(s) | Reason |
|-------|------|----------|--------|
| `user_inventory_idx` | Standard | `user_id` | Primary query — get all cards for one user |
| `user_card_unique` | Unique Compound | `user_id` + `card_id` | Enforces one doc per user+card, enables safe upsert |

The compound unique index on `(user_id, card_id)` is critical. It lets pack opening use `update_one` with `upsert=True` — if the user already owns the card, increment `quantity`; if not, create a new document. Without this index, duplicate documents can be created under concurrent requests.

### Example Documents

```json
{
  "_id": { "$oid": "666400000000000000000001" },
  "user_id": { "$oid": "666100000000000000000001" },
  "card_id": { "$oid": "666200000000000000000001" },
  "quantity": 2,
  "acquired_at": { "$date": "2026-06-02T14:30:00Z" }
}
```

```json
{
  "_id": { "$oid": "666400000000000000000002" },
  "user_id": { "$oid": "666100000000000000000001" },
  "card_id": { "$oid": "666200000000000000000006" },
  "quantity": 1,
  "acquired_at": { "$date": "2026-06-03T09:15:00Z" }
}
```

### Validation rules
- `quantity` must always be >= 1 (if 0, delete the document instead)
- A user cannot have two documents with the same `card_id` (enforced by unique index)
- Before allowing a card to be used in battle, confirm `quantity >= 1` for the user's inventory entry

---

## Collection 5: `battles`

One document per battle game. Both players open the **same pack type** as part of the battle. Resolution is synchronous — the join request runs the draw, compares totals, and writes all results in one atomic sequence. No polling or WebSocket needed for MVP.

### Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | MongoDB auto-generated |
| `mode` | String | yes | `"duel"` | Hardcoded for MVP |
| `status` | String | yes | `"waiting"` | Enum: `waiting`, `complete` |
| `pack_id` | ObjectId | yes | — | Reference to `packs._id` — the pack **both** players open |
| `pack_cost` | Int | yes | — | Snapshot of `pack.cost` at creation time (for display and audit) |
| `creator_id` | ObjectId | yes | — | Reference to `users._id` |
| `creator_cards` | Array | yes | — | Card snapshots drawn from the pack; see structure below |
| `creator_total_value` | Double | yes | — | Sum of `creator_cards[].value` |
| `opponent_id` | ObjectId | no | null | Set when player 2 joins |
| `opponent_cards` | Array | no | null | Card snapshots drawn from the same pack; set on join |
| `opponent_total_value` | Double | no | null | Sum of `opponent_cards[].value`; set on join |
| `winner_id` | ObjectId | no | null | Set when resolved |
| `total_value_at_stake` | Double | no | null | `creator_total_value + opponent_total_value`; set when resolved |
| `created_at` | Date | yes | now | UTC timestamp |
| `resolved_at` | Date | no | null | Set when status → `complete` |

### Card Snapshot Structure

Each element of `creator_cards` and `opponent_cards` is an embedded sub-document:

| Field | Type | Notes |
|-------|------|-------|
| `card_id` | ObjectId | Reference to `cards._id` — used when upserting to winner's inventory |
| `name` | String | Snapshot at draw time |
| `image_url` | String | Snapshot at draw time |
| `rarity` | String | Snapshot at draw time |
| `value` | Double | Snapshot at draw time — preserved even if card value changes later |

Cards are **not** added to any inventory when drawn for a battle. They live on the battle document until the battle resolves, then all cards (both players' draws) are upserted into the winner's inventory in a single operation.

### Indexes

| Index | Type | Field(s) | Reason |
|-------|------|----------|--------|
| `status_idx` | Standard | `status` | Lobby query: filter for `waiting` battles |
| `creator_open_idx` | Compound | `creator_id` + `status` | Prevent one user from creating multiple open battles |
| `pack_status_idx` | Compound | `pack_id` + `status` | Browse open battles filtered by pack type |

### Status Lifecycle

```
[CREATE]                              [JOIN + RESOLVE]
 waiting   ──────────────────────►    complete
           (join deducts credits,
            draws opponent cards,
            compares totals,
            upserts winner inventory —
            all in one request)
```

There is no `active` state. The battle moves directly from `waiting` to `complete` when player 2 joins because resolution is synchronous.

### Example Documents

**Waiting (player 2 not yet joined):**
```json
{
  "_id": { "$oid": "666500000000000000000001" },
  "mode": "duel",
  "status": "waiting",
  "pack_id": { "$oid": "666300000000000000000001" },
  "pack_cost": 100,
  "creator_id": { "$oid": "666100000000000000000001" },
  "creator_cards": [
    { "card_id": { "$oid": "666200000000000000000001" }, "name": "Pokemon Test Card 1",  "image_url": "/imgs/image 29.png",      "rarity": "common",   "value": 10.00 },
    { "card_id": { "$oid": "666200000000000000000003" }, "name": "Pokemon Test Card 3",  "image_url": "/imgs/image 29 (2).png", "rarity": "common",   "value": 12.00 },
    { "card_id": { "$oid": "666200000000000000000009" }, "name": "Pokemon Test Card 9",  "image_url": "/imgs/image 29 (8).png", "rarity": "uncommon", "value": 45.00 },
    { "card_id": { "$oid": "666200000000000000000002" }, "name": "Pokemon Test Card 2",  "image_url": "/imgs/image 29 (1).png", "rarity": "common",   "value":  8.00 },
    { "card_id": { "$oid": "666200000000000000000007" }, "name": "Pokemon Test Card 7",  "image_url": "/imgs/image 29 (6).png", "rarity": "common",   "value": 13.00 }
  ],
  "creator_total_value": 88.00,
  "opponent_id": null,
  "opponent_cards": null,
  "opponent_total_value": null,
  "winner_id": null,
  "total_value_at_stake": null,
  "created_at": { "$date": "2026-06-06T10:00:00Z" },
  "resolved_at": null
}
```

**Complete (resolved — creator wins 209 vs 78):**
```json
{
  "_id": { "$oid": "666500000000000000000002" },
  "mode": "duel",
  "status": "complete",
  "pack_id": { "$oid": "666300000000000000000001" },
  "pack_cost": 100,
  "creator_id": { "$oid": "666100000000000000000001" },
  "creator_cards": [
    { "card_id": { "$oid": "666200000000000000000001" }, "name": "Pokemon Test Card 1",  "image_url": "/imgs/image 29.png",      "rarity": "common",   "value":  10.00 },
    { "card_id": { "$oid": "666200000000000000000009" }, "name": "Pokemon Test Card 9",  "image_url": "/imgs/image 29 (8).png", "rarity": "uncommon", "value":  45.00 },
    { "card_id": { "$oid": "666200000000000000000015" }, "name": "Pokemon Test Card 15", "image_url": "/imgs/image 30 (1).png", "rarity": "rare",     "value": 130.00 },
    { "card_id": { "$oid": "666200000000000000000004" }, "name": "Pokemon Test Card 4",  "image_url": "/imgs/image 29 (3).png", "rarity": "common",   "value":   9.00 },
    { "card_id": { "$oid": "666200000000000000000006" }, "name": "Pokemon Test Card 6",  "image_url": "/imgs/image 29 (5).png", "rarity": "common",   "value":  15.00 }
  ],
  "creator_total_value": 209.00,
  "opponent_id": { "$oid": "666100000000000000000002" },
  "opponent_cards": [
    { "card_id": { "$oid": "666200000000000000000002" }, "name": "Pokemon Test Card 2",  "image_url": "/imgs/image 29 (1).png",  "rarity": "common",   "value":  8.00 },
    { "card_id": { "$oid": "666200000000000000000003" }, "name": "Pokemon Test Card 3",  "image_url": "/imgs/image 29 (2).png",  "rarity": "common",   "value": 12.00 },
    { "card_id": { "$oid": "666200000000000000000011" }, "name": "Pokemon Test Card 11", "image_url": "/imgs/image 29 (10).png", "rarity": "uncommon", "value": 40.00 },
    { "card_id": { "$oid": "666200000000000000000008" }, "name": "Pokemon Test Card 8",  "image_url": "/imgs/image 29 (7).png",  "rarity": "common",   "value":  7.00 },
    { "card_id": { "$oid": "666200000000000000000005" }, "name": "Pokemon Test Card 5",  "image_url": "/imgs/image 29 (4).png",  "rarity": "common",   "value": 11.00 }
  ],
  "opponent_total_value": 78.00,
  "winner_id": { "$oid": "666100000000000000000001" },
  "total_value_at_stake": 287.00,
  "created_at": { "$date": "2026-06-06T10:00:00Z" },
  "resolved_at": { "$date": "2026-06-06T10:04:32Z" }
}
```

Creator wins (209 > 78). All 10 cards are upserted into the creator's inventory. Opponent gets nothing.

### Validation rules
- A user cannot be both `creator_id` and `opponent_id` on the same battle
- A user can only have one battle in `status: "waiting"` at a time (checked by application before insert)
- Creator's credits must be >= `pack_cost` before the battle is created; deduct immediately on create
- Opponent's credits must be >= `battle.pack_cost` before they can join; deduct immediately on join
- `pack_cost` is snapshotted from the pack at creation time — the opponent pays the snapshotted amount, not a live lookup
- On resolve: winner is the player with the higher `total_value`; tie goes to creator
- On resolve: upsert all cards from `creator_cards` + `opponent_cards` into winner's `inventory` using the compound unique index (`user_id`, `card_id`) with `$inc: { quantity: 1 }`
- On resolve: increment `winner.wins` and loser's `losses` on the `users` document

---

## Complete Index Reference

```
Collection    Index Name            Fields                    Type
──────────────────────────────────────────────────────────────────
users         email_unique          email                     Unique
cards         rarity_idx            rarity                    Standard
cards         game_idx              game                      Standard
cards         price_source_idx      price_source              Standard
inventory     user_inventory_idx    user_id                   Standard
inventory     user_card_unique      (user_id, card_id)        Unique Compound
battles       status_idx            status                    Standard
battles       creator_open_idx      (creator_id, status)      Compound
battles       pack_status_idx       (pack_id, status)         Compound
```

Total: **9 indexes** across 5 collections.

---

## MongoDB Compass Setup Instructions

### Step 1 — Install MongoDB Community Server (if not already installed)

1. Go to [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Select: Version `7.0`, Platform `Windows`, Package `msi`
3. Run the installer — choose "Complete" setup
4. Check "Install MongoDB as a Service" (runs automatically on startup)
5. Also install **MongoDB Compass** when prompted (it is bundled in the installer)

Verify MongoDB is running:
```
Open PowerShell → type: mongosh
You should see the MongoDB shell prompt: test>
Type: exit
```

### Step 2 — Open MongoDB Compass

1. Open MongoDB Compass from the Start menu
2. On the connection screen, the default URI is already filled in: `mongodb://localhost:27017`
3. Click **Connect**
4. You are now connected to your local MongoDB instance

### Step 3 — Create the Database and Collections

1. In the left sidebar, click **+** next to "Databases"
2. Database Name: `packbattles`
3. Collection Name: `cards` (create the first collection here)
4. Click **Create Database**

Then create the remaining 4 collections (click **+** next to the `packbattles` database):
- `packs`
- `users`
- `inventory`
- `battles`

### Step 4 — Create Indexes via Compass

For each collection below, click the collection → click the **Indexes** tab → click **Create Index**.

**`users` collection:**
- Field: `email`, Type: `1 (asc)`, Options: check **Unique** → Create

**`cards` collection:**
- Field: `rarity`, Type: `1 (asc)` → Create
- Field: `game`, Type: `1 (asc)` → Create
- Field: `price_source`, Type: `1 (asc)` → Create

**`inventory` collection:**
- Field: `user_id`, Type: `1 (asc)` → Create
- Fields: `user_id: 1` AND `card_id: 1`, Options: check **Unique** → Create  
  *(click "+ Add another field" to add both fields to one index)*

**`battles` collection:**
- Field: `status`, Type: `1 (asc)` → Create
- Fields: `creator_id: 1` AND `status: 1` → Create
- Fields: `pack_id: 1` AND `status: 1` → Create

### Step 5 — Verify

After creating indexes, click each collection → **Indexes** tab. You should see:

```
users:       _id_ (default), email_1 (unique)
cards:       _id_ (default), rarity_1, game_1
packs:       _id_ (default)
inventory:   _id_ (default), user_id_1, user_id_1_card_id_1 (unique)
battles:     _id_ (default), status_1, creator_id_1_status_1, pack_id_1_status_1
```

The database is now ready for the seed script.

---

## Seed Data

The seed script populates `cards` and `packs`. It does NOT touch `users`, `inventory`, or `battles` — those are created by the application.

### Full Card Set (20 Pokemon test cards)

All cards use `market_price: null` and `price_source: "manual"` until TCGplayer integration.  
Images are existing placeholder art from `Frontend/public/imgs/`.

#### Common (8 cards, value 7–15 credits)

| # | Name | Value | Image |
|---|------|-------|-------|
| 1 | Pokemon Test Card 1 | 10 | `/imgs/image 29.png` |
| 2 | Pokemon Test Card 2 | 8 | `/imgs/image 29 (1).png` |
| 3 | Pokemon Test Card 3 | 12 | `/imgs/image 29 (2).png` |
| 4 | Pokemon Test Card 4 | 9 | `/imgs/image 29 (3).png` |
| 5 | Pokemon Test Card 5 | 11 | `/imgs/image 29 (4).png` |
| 6 | Pokemon Test Card 6 | 15 | `/imgs/image 29 (5).png` |
| 7 | Pokemon Test Card 7 | 13 | `/imgs/image 29 (6).png` |
| 8 | Pokemon Test Card 8 | 7 | `/imgs/image 29 (7).png` |

#### Uncommon (6 cards, value 35–65 credits)

| # | Name | Value | Image |
|---|------|-------|-------|
| 9 | Pokemon Test Card 9 | 45 | `/imgs/image 29 (8).png` |
| 10 | Pokemon Test Card 10 | 55 | `/imgs/image 29 (9).png` |
| 11 | Pokemon Test Card 11 | 40 | `/imgs/image 29 (10).png` |
| 12 | Pokemon Test Card 12 | 60 | `/imgs/image 29 (11).png` |
| 13 | Pokemon Test Card 13 | 50 | `/imgs/image 29 (12).png` |
| 14 | Pokemon Test Card 14 | 35 | `/imgs/image 30.png` |

#### Rare (4 cards, value 130–200 credits)

| # | Name | Value | Image |
|---|------|-------|-------|
| 15 | Pokemon Test Card 15 | 130 | `/imgs/image 30 (1).png` |
| 16 | Pokemon Test Card 16 | 180 | `/imgs/image 30 (2).png` |
| 17 | Pokemon Test Card 17 | 150 | `/imgs/image 30 (3).png` |
| 18 | Pokemon Test Card 18 | 200 | `/imgs/image 30 (4).png` |

#### Ultra Rare (2 cards, value 350–500 credits)

| # | Name | Value | Image |
|---|------|-------|-------|
| 19 | Pokemon Test Card 19 | 350 | `/imgs/image 30 (5).png` |
| 20 | Pokemon Test Card 20 | 500 | `/imgs/image 30 (6).png` |

---

### Pack Definitions (3 test packs)

All packs are Pokemon-only for MVP. Pack images use existing karte1 assets.

#### Pack A — Test Pack Alpha
- Cost: **100 credits** | Cards per open: 5 | Image: `/imgs/karte1 2.png`
- Profile: common-heavy, cheapest entry point for new users

| Card | Rarity | Weight | Approx. % |
|------|--------|--------|-----------|
| Test Card 1 | common | 18 | 12.2% |
| Test Card 2 | common | 18 | 12.2% |
| Test Card 3 | common | 18 | 12.2% |
| Test Card 4 | common | 16 | 10.8% |
| Test Card 5 | common | 16 | 10.8% |
| Test Card 6 | common | 14 | 9.5% |
| Test Card 7 | common | 14 | 9.5% |
| Test Card 8 | common | 14 | 9.5% |
| Test Card 9 | uncommon | 5 | 3.4% |
| Test Card 10 | uncommon | 5 | 3.4% |
| Test Card 11 | uncommon | 5 | 3.4% |
| Test Card 15 | rare | 2 | 1.4% |
| Test Card 19 | ultra_rare | 1 | 0.7% |
| **Total weight** | | **146** | 100% |

#### Pack B — Test Pack Beta
- Cost: **150 credits** | Cards per open: 5 | Image: `/imgs/karte1 2 (1).png`
- Profile: balanced across all rarities

| Card | Rarity | Weight | Approx. % |
|------|--------|--------|-----------|
| Test Card 1 | common | 10 | 9.7% |
| Test Card 2 | common | 10 | 9.7% |
| Test Card 3 | common | 10 | 9.7% |
| Test Card 4 | common | 8 | 7.8% |
| Test Card 9 | uncommon | 12 | 11.7% |
| Test Card 10 | uncommon | 12 | 11.7% |
| Test Card 11 | uncommon | 12 | 11.7% |
| Test Card 12 | uncommon | 10 | 9.7% |
| Test Card 13 | uncommon | 10 | 9.7% |
| Test Card 15 | rare | 6 | 5.8% |
| Test Card 16 | rare | 6 | 5.8% |
| Test Card 17 | rare | 4 | 3.9% |
| Test Card 19 | ultra_rare | 3 | 2.9% |
| Test Card 20 | ultra_rare | 2 | 1.9% |
| **Total weight** | | **115** | 100% |

#### Pack C — Test Pack Gamma
- Cost: **200 credits** | Cards per open: 5 | Image: `/imgs/karte1 2 (2).png`
- Profile: rare-heavy, highest cost, best odds at top cards

| Card | Rarity | Weight | Approx. % |
|------|--------|--------|-----------|
| Test Card 5 | common | 6 | 5.1% |
| Test Card 6 | common | 6 | 5.1% |
| Test Card 9 | uncommon | 10 | 8.5% |
| Test Card 10 | uncommon | 10 | 8.5% |
| Test Card 12 | uncommon | 10 | 8.5% |
| Test Card 14 | uncommon | 8 | 6.8% |
| Test Card 15 | rare | 14 | 11.9% |
| Test Card 16 | rare | 14 | 11.9% |
| Test Card 17 | rare | 12 | 10.2% |
| Test Card 18 | rare | 12 | 10.2% |
| Test Card 19 | ultra_rare | 8 | 6.8% |
| Test Card 20 | ultra_rare | 8 | 6.8% |
| **Total weight** | | **118** | 100% |

---

## Seed Script

File: `packbattles/BackEnd/seed.py` — already written, do not recreate.

Run it once after MongoDB is running: `python seed.py`

It is idempotent — drops and recreates `cards` and `packs` on each run. Does NOT touch `users`, `inventory`, or `battles`.

Key design decisions baked into the script:
- All 20 cards have `market_price: null` and `price_source: "manual"` — the fields exist now; real prices fill in via a future TCGplayer sync script without touching application code
- Cards are inserted first; packs reference card `_id`s via a name → ObjectId map built immediately after insert
- `price_source_idx` on `cards.price_source` lets a future sync script query `{ price_source: "manual" }` to find all cards still needing real prices
- `pack_status_idx` compound index on `(pack_id, status)` supports browsing open battles filtered by pack type

---

## Verify the Seed in Compass

After running `python seed.py`, open Compass and confirm:

**Terminal output should read:**
```
  users:          0  (untouched)
  cards:         20
  packs:          3
  inventory:      0  (untouched)
  battles:        0  (untouched)

  common        8 cards
  uncommon      6 cards
  rare          4 cards
  ultra_rare    2 cards
```

**`cards` collection → Documents tab**  
You should see 20 documents, all with `game: "Pokemon"`. Filter to confirm `market_price` is null:
```json
{ "market_price": null }
```
Should return all 20 documents. Filter by rarity to spot-check:
```json
{ "rarity": "ultra_rare" }
```
Should return exactly 2 documents (Test Card 19 and Test Card 20).

**`packs` collection → Documents tab**  
You should see 3 documents. Click into "Test Pack Alpha" and expand its `pool` array — each entry should have a `card_id` that looks like a valid ObjectId (not a string).

**`cards` collection → Indexes tab**  
Should show `rarity_1`, `game_1`, and `price_source_1`.

**`inventory` collection → Indexes tab**  
Should show `user_id_1_card_id_1` with a `UNIQUE` badge.

**`users` collection → Indexes tab**  
Should show `email_1` with a `UNIQUE` badge.

---

## Things to Confirm Before Coding Starts

Review these questions and confirm each one before implementation begins:

1. **Starter credits** — Is 300 credits (= 3 Pokemon packs) the right starting amount? Too generous? Too tight?
2. **Pack costs** — 100 / 150 / 200 credits. Does this feel right for the economy?
3. **Battle resolution** — Each player opens 5 cards from the same pack; higher TOTAL value wins. Is this the intended Duel Battle mechanic, or should something else determine the winner?
4. **Tie rule** — If both players' total values are exactly equal, the creator wins. Acceptable?
5. **Battle reward** — Winner receives ALL cards drawn by both players (up to 10 cards total) added to inventory. Loser receives nothing. Is this correct?
6. **Card images** — The seed script uses existing `/imgs/image 29.png` – `/imgs/image 30 (6).png` as placeholder art. All 26 of those files are confirmed to exist in `Frontend/public/imgs/`. Real images will be swapped in by updating `image_url` in the database — no code changes needed.
7. **Card value scale** — Common: 7–15 credits. Uncommon: 35–65 credits. Rare: 130–200 credits. Ultra rare: 350–500 credits. Does this range make sense for the game economy?
8. **One open battle per user** — A user cannot create a second battle while one is waiting. Is this rule correct?
9. **Can a user battle themselves?** — Currently blocked. Confirm.
10. **Database name** — `packbattles` (lowercase, no spaces). Confirm this is the name to use everywhere.
