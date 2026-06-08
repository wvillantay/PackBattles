# Phase 3 — Duel Battle MVP (Pack-Based): Backend Test Plan

## Mechanic summary
Both players pay to open the **same pack type** during the battle.
The server draws each player's cards independently.
Higher total pack value wins. Exact tie → server-side coin flip.
Winner receives **all** drawn cards from both packs.
Creator's draw is stored hidden and revealed only when the battle resolves.

---

## Prerequisites
- Backend running on `http://localhost:8080`
- MongoDB Atlas connected; `packs` collection has at least one pack with a `pool`
- Two registered users (User A and User B), each with enough credits to open a pack

---

## Setup: Obtain auth tokens

**User A**
```
POST http://localhost:8080/api/auth/login
{ "email": "usera@example.com", "password": "passwordA" }
```
→ Save as **TOKEN_A**

**User B**
```
POST http://localhost:8080/api/auth/login
{ "email": "userb@example.com", "password": "passwordB" }
```
→ Save as **TOKEN_B**

---

## Step 1 — List battles (empty)

```
GET http://localhost:8080/api/battles
Authorization: Bearer TOKEN_A
```

**Expected:** `200 OK`, body `[]`

---

## Step 2 — Get available packs

```
GET http://localhost:8080/api/packs
```

**Expected:** Array of packs. Note the `id` of a pack both users can afford.
Save as **PACK_ID** and note **PACK_COST**.

---

## Step 3 — Create a battle (User A) — single pack

```
POST http://localhost:8080/api/battles
Authorization: Bearer TOKEN_A
Content-Type: application/json

{ "pack_id": "<PACK_ID>", "pack_quantity": 1 }
```

(Omitting `pack_quantity` also defaults to 1.)

**Expected:** `201 Created`
```json
{
  "id":            "<battle_id>",
  "status":        "open",
  "creator_id":    "<user_a_id>",
  "pack_id":       "<PACK_ID>",
  "pack_name":     "...",
  "pack_cost":     <PACK_COST>,
  "pack_quantity": 1,
  "total_cost":    <PACK_COST>,
  "created_at":    "..."
}
```

Verify:
- Response does NOT contain `creator_cards` or `creator_total`
- Save `id` as **BATTLE_ID**

---

## Step 3b — Create a multi-pack battle (User A) — 3 packs

```
POST http://localhost:8080/api/battles
Authorization: Bearer TOKEN_A
Content-Type: application/json

{ "pack_id": "<PACK_ID>", "pack_quantity": 3 }
```

**Expected:** `201 Created` with `pack_quantity: 3` and `total_cost: PACK_COST × 3`

Verify:
- Creator credits deducted by `PACK_COST × 3`

---

## Step 3c — Invalid pack_quantity rejected

```
POST http://localhost:8080/api/battles
Authorization: Bearer TOKEN_A
Content-Type: application/json

{ "pack_id": "<PACK_ID>", "pack_quantity": 4 }
```

**Expected:** `400 Bad Request`
```json
{ "error": "pack_quantity must be 1, 2, 3, 5, or 10" }
```

---

## Step 4 — Creator credits deducted

```
GET http://localhost:8080/api/me
Authorization: Bearer TOKEN_A
```

**Expected:** `credits` = previous value − TOTAL_COST (PACK_COST × pack_quantity)

---

## Step 5 — Battle appears in list (hidden draw)

```
GET http://localhost:8080/api/battles
Authorization: Bearer TOKEN_A
```

**Expected:** Array contains one entry for BATTLE_ID with:
- `creator_name` = User A's name
- `pack_name`, `pack_cost`, `pack_quantity`, `total_cost` present
- `creator_cards` and `creator_total` are **absent**

---

## Step 6 — Single battle detail (hidden while open)

```
GET http://localhost:8080/api/battles/<BATTLE_ID>
Authorization: Bearer TOKEN_B
```

**Expected:** `200 OK` with `status: "open"`, and **no** `creator_cards` / `creator_total` fields.

---

## Step 7 — Creator cannot join own battle

```
POST http://localhost:8080/api/battles/<BATTLE_ID>/join
Authorization: Bearer TOKEN_A
```

**Expected:** `400 Bad Request`
```json
{ "error": "You cannot join your own battle" }
```

---

## Step 8 — Opponent with insufficient credits is rejected

If User B's credits < PACK_COST, attempt to join.

**Expected:** `400 Bad Request`
```json
{ "error": "Insufficient credits" }
```

---

## Step 9 — Join battle and resolve (User B)

```
POST http://localhost:8080/api/battles/<BATTLE_ID>/join
Authorization: Bearer TOKEN_B
```
*(no request body required)*

**Expected:** `200 OK` — full result revealed:
```json
{
  "id":             "<BATTLE_ID>",
  "status":         "completed",
  "pack_name":      "...",
  "pack_cost":      <float>,
  "pack_quantity":  <int>,
  "total_cost":     <float>,
  "creator_name":   "User A",
  "creator_total":  <float>,
  "creator_cards":  [ {...}, ... ],
  "opponent_name":  "User B",
  "opponent_total": <float>,
  "opponent_cards": [ {...}, ... ],
  "winner_id":      "<id of higher-total player>",
  "tiebreaker":     null,
  "completed_at":   "..."
}
```

Verify:
- `creator_cards` length = `pack_quantity × cards_per_open`
- `opponent_cards` length = `pack_quantity × cards_per_open`
- `winner_id` matches the player with higher `creator_total` vs `opponent_total`

---

## Step 10 — Opponent credits deducted

```
GET http://localhost:8080/api/me
Authorization: Bearer TOKEN_B
```

**Expected:** `credits` = previous value − TOTAL_COST (PACK_COST × pack_quantity)

---

## Step 11 — Winner's inventory updated

Fetch inventory for the **winner**:

```
GET http://localhost:8080/api/inventory
Authorization: Bearer TOKEN_<WINNER>
```

**Expected:** All cards from BOTH `creator_cards` and `opponent_cards` are in the winner's inventory.

---

## Step 12 — Loser receives no cards

```
GET http://localhost:8080/api/inventory
Authorization: Bearer TOKEN_<LOSER>
```

**Expected:** None of the battle's drawn cards appear in the loser's inventory (they were never added).

---

## Step 13 — Battle status completed; draw no longer hidden

```
GET http://localhost:8080/api/battles/<BATTLE_ID>
Authorization: Bearer TOKEN_A
```

**Expected:** `status: "completed"` and full card details for both players are now present.

---

## Step 14 — Battle cannot be joined twice

```
POST http://localhost:8080/api/battles/<BATTLE_ID>/join
Authorization: Bearer TOKEN_B
```

**Expected:** `400 Bad Request`
```json
{ "error": "Battle is already completed" }
```

---

## Step 15 — Win / loss stats updated

```
GET http://localhost:8080/api/me
Authorization: Bearer TOKEN_<WINNER>
```

**Expected:** `wins` incremented by 1.

```
GET http://localhost:8080/api/me
Authorization: Bearer TOKEN_<LOSER>
```

**Expected:** `losses` incremented by 1.

---

## Step 16 — Tiebreaker (exact tie)

Arrange two draws with identical totals (requires manipulating pack pool or using a pack with a single card of fixed value so both players draw the same value).

1. Create and join a battle as above.
2. In the join response verify:
   - `tiebreaker` is `"creator"` or `"opponent"` (not `null`)
   - `winner_id` matches the player named by `tiebreaker`
3. In MongoDB Atlas battles collection confirm `tiebreaker` field is set.

---

## Step 17 — Validation guards

| Request | Expected |
|---|---|
| `POST /api/battles` with missing `pack_id` | `400` — pack_id is required |
| `POST /api/battles` with invalid `pack_id` format | `400` — Invalid pack_id |
| `POST /api/battles` with non-existent `pack_id` | `404` — Pack not found |
| `POST /api/battles` with `pack_quantity: 4` (not in allowed set) | `400` — pack_quantity must be 1, 2, 3, 5, or 10 |
| `POST /api/battles` with `pack_quantity: 0` | `400` — pack_quantity must be 1, 2, 3, 5, or 10 |
| `POST /api/battles` when creator has insufficient credits for total_cost | `400` — Insufficient credits |
| `GET /api/battles/<bad_id>` | `400` — Invalid battle id |
| `GET /api/battles/<nonexistent>` | `404` — Battle not found |
| Any endpoint without `Authorization` header | `401` |

---

## MongoDB Atlas verification

Open **battles** collection, find BATTLE_ID document and confirm:
- `type: "duel"`, `status: "completed"`
- `pack_id`: ObjectId matching PACK_ID
- `pack_cost`: matches per-pack cost
- `pack_quantity`: 1/2/3/5/10 as set at creation
- `creator_id`, `opponent_id`: correct ObjectIds
- `creator_cards`, `opponent_cards`: arrays of ObjectIds (lengths = cards_per_open)
- `creator_total`, `opponent_total`: floats
- `winner_id`: correct ObjectId
- `tiebreaker`: `null` or `"creator"` / `"opponent"`
- `created_at`, `completed_at`: both timestamps present

---

## Completion checklist

- [ ] `POST /api/battles` requires `pack_id`, rejects missing/invalid values
- [ ] `POST /api/battles` with `pack_quantity` not in {1,2,3,5,10} → 400
- [ ] Creator's credits deducted by `pack_cost × pack_quantity` on battle creation
- [ ] `GET /api/battles` omits `creator_cards` and `creator_total` (hidden draw)
- [ ] `GET /api/battles/<id>` (open) also hides creator's draw
- [ ] Creator cannot join own battle (400)
- [ ] Opponent with insufficient credits is rejected (400)
- [ ] `POST /api/battles/<id>/join` requires no body
- [ ] Opponent's pack drawn server-side using same pack pool
- [ ] Opponent's credits deducted
- [ ] Join response reveals both draws simultaneously
- [ ] Winner determined by higher total; coin flip on exact tie
- [ ] All drawn cards (both packs) transferred to winner's inventory
- [ ] Loser receives no cards
- [ ] `wins` / `losses` incremented correctly
- [ ] Battle `status` set to `"completed"` in MongoDB
- [ ] Completed battle cannot be joined again (400)
- [ ] `GET /api/battles/<id>` (completed) reveals full draw details
