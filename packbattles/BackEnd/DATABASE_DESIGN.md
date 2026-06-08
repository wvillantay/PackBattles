# PackBattles — Database Design

MongoDB Atlas. Database name: `packbattles`.

---

## Collections

### users

```json
{
  "_id":           ObjectId,
  "name":          string,
  "email":         string,       // stored lowercase; unique index
  "password_hash": binary,       // bcrypt hash — never store plaintext
  "credits":       number,       // starts at 300
  "wins":          number,       // incremented on battle win
  "losses":        number,       // incremented on battle loss
  "created_at":    ISODate
}
```

Indexes:
- `{ email: 1 }` unique

---

### packs

```json
{
  "_id":            ObjectId,
  "name":           string,
  "image_url":      string,
  "cost":           number,      // credits required to open
  "cards_per_open": number,      // how many cards drawn per open
  "pool": [
    {
      "card_id": ObjectId,       // ref → cards._id
      "weight":  number          // relative probability weight
    }
  ]
}
```

---

### cards

```json
{
  "_id":       ObjectId,
  "name":      string,
  "image_url": string,
  "rarity":    string,   // "common" | "uncommon" | "rare" | "ultra_rare"
  "value":     number    // credit value used in battle total calculation
}
```

---

### inventory

Tracks cards owned by each user. One document per (user, card) pair; duplicates
are handled by incrementing `quantity`.

```json
{
  "_id":         ObjectId,
  "user_id":     ObjectId,   // ref → users._id
  "card_id":     ObjectId,   // ref → cards._id
  "quantity":    number,     // >= 1; document removed when quantity reaches 0
  "acquired_at": ISODate     // set on first acquisition ($setOnInsert)
}
```

Indexes:
- `{ user_id: 1, card_id: 1 }` unique compound

**Upsert pattern (correct):**
```js
filter:  { user_id, card_id }
update:  { $inc: { quantity: 1 }, $setOnInsert: { acquired_at } }
// Do NOT include user_id or card_id inside $setOnInsert — they are already
// in the filter and MongoDB writes them automatically on upsert-insert.
// Repeating them creates a conflicting-path error that MongoDB swallows
// silently (no exception, no document written).
```

---

### battles

Duel Battle MVP. One document per battle.

```json
{
  "_id":            ObjectId,
  "type":           "duel",
  "status":         "open" | "completed",

  "pack_id":        ObjectId,    // ref → packs._id — the pack both players open
  "pack_cost":      number,      // snapshot of per-pack cost at battle creation time
  "pack_quantity":  number,      // 1 | 2 | 3 | 5 | 10 — packs each player opens

  "creator_id":     ObjectId,    // ref → users._id
  "creator_cards":  [ObjectId],  // cards drawn from creator's pack opening
  "creator_total":  number,      // sum of drawn card values (hidden while open)

  "opponent_id":    ObjectId | null,
  "opponent_cards": [ObjectId] | null,
  "opponent_total": number | null,

  "winner_id":      ObjectId | null,
  "tiebreaker":     "creator" | "opponent" | null,
                                 // non-null only when totals are exactly equal

  "created_at":     ISODate,
  "completed_at":   ISODate | null
}
```

**Hidden draw rule:** While `status == "open"`, `creator_cards` and
`creator_total` are stored in MongoDB but NEVER returned by `GET /api/battles`
(list) or `GET /api/battles/<id>`. They are revealed only inside the
`POST /api/battles/<id>/join` response, simultaneously with the opponent's draw.

**Card transfer on resolution:**
- All cards from `creator_cards` + `opponent_cards` are upserted into the
  winner's inventory using `$inc + $setOnInsert`.
- The loser receives no cards (their drawn cards go directly to the winner).
- Cards are freshly drawn from the pack pool — the loser never held them in
  their inventory to begin with.

---

## Indexes (recommended)

```js
db.users.createIndex({ email: 1 }, { unique: true })
db.inventory.createIndex({ user_id: 1, card_id: 1 }, { unique: true })
db.battles.createIndex({ status: 1, created_at: -1 })
```
