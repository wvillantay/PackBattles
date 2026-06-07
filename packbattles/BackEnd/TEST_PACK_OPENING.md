# Test Pack Opening

Exact steps to verify Phase 1 (Packs + Open Pack) end-to-end.
Run in order. Every step must pass before the next is meaningful.

---

## Prerequisites

- Flask backend running: `python main.py` in `packbattles/BackEnd/`
- Frontend dev server running: `npm run dev` in `packbattles/Frontend/`
- seed.py has been run at least once (20 cards + 3 packs in Atlas)
- You are logged in (from Phase 0B)

---

## Step 1 — GET /api/packs returns real packs

```
curl http://localhost:8080/api/packs
```

Expected: JSON array of 3 pack objects. Each must have `id`, `name`, `image_url`, `cost`, `cards_per_open`. The `pool` field must NOT appear (excluded from the list view).

```json
[
  { "id": "...", "name": "Test Pack Alpha", "image_url": "/imgs/karte1 2.png", "cost": 100, "cards_per_open": 5 },
  { "id": "...", "name": "Test Pack Beta",  "image_url": "/imgs/karte1 2 (1).png", "cost": 150, "cards_per_open": 5 },
  { "id": "...", "name": "Test Pack Gamma", "image_url": "/imgs/karte1 2 (2).png", "cost": 200, "cards_per_open": 5 }
]
```

---

## Step 2 — GET /api/packs/<id> returns pool

Copy an `id` from Step 1. Replace `PACK_ID` below:

```
curl http://localhost:8080/api/packs/PACK_ID
```

Expected: full pack document including `pool` array. Each pool entry must have:
- `card.name`, `card.image_url`, `card.rarity`, `card.value`
- `weight` (integer)
- `chance_percent` (e.g. `12.3`)

Confirm `chance_percent` values across all pool entries roughly sum to 100.

---

## Step 3 — Packs page shows real data

1. Log in and go to `http://localhost:5173/packs`.
2. You should see **3 pack cards** with real names: "Test Pack Alpha", "Test Pack Beta", "Test Pack Gamma".
3. Each card shows the real credit cost (100 / 150 / 200).
4. Clicking a pack card navigates to `/pack?id=<real_id>`.

---

## Step 4 — Pack detail page shows real data

1. Click "Test Pack Alpha" from the Packs page.
2. URL should be `/pack?id=<id>` (not just `/pack`).
3. Page shows:
   - Pack name: "Test Pack Alpha"
   - Pack image (karte1 2.png)
   - Info tag: "5 cards per open · 13 possible cards"
   - "Open for 100 credits" button
   - OwlCarousel with real card names, rarity labels, and chance percentages

---

## Step 5 — Open Pack deducts credits and returns cards

1. Note your current credit balance in the header (e.g. 300). The button must read **Open for 100 credits** and be clickable — if the user has enough credits, it is never disabled.
2. On the Test Pack Alpha detail page, click **Open for 100 credits**.
3. Button shows "Opening..." briefly and becomes temporarily disabled during the request.

Expected result overlay:
- Heading: "Pack Opened!"
- Shows "Credits remaining: 200" (300 − 100)
- Shows **5 cards** with name, rarity label, and credit value each
- Header credit balance updates to 200

---

## Step 6 — Backend: POST /api/packs/<id>/open with curl

Get a valid token first (from a login call):

```
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"password123\"}"
```

Copy the token. Then open a pack (replace PACK_ID and TOKEN):

```
curl -s -X POST http://localhost:8080/api/packs/PACK_ID/open \
  -H "Authorization: Bearer TOKEN"
```

Expected (HTTP 200):

```json
{
  "credits_remaining": 200,
  "cards_received": [
    { "id": "...", "name": "Pokemon Test Card X", "image_url": "...", "rarity": "common", "value": 10.0 },
    ...
  ]
}
```

`cards_received` must have exactly **5 items** (cards_per_open for Alpha).

---

## Step 7 — Cards appear in Atlas inventory collection

1. Open MongoDB Compass → database `packbattles` → collection `inventory`.
2. Filter: `{ "user_id": ObjectId("YOUR_USER_ID") }` (use the id returned from login).
3. You should see documents with:
   - `user_id` matching your user
   - `card_id` matching cards that were drawn
   - `quantity` = 1 (or higher if you drew the same card twice)
   - `acquired_at` timestamp

---

## Step 8 — Insufficient credits: button disabled in UI and API returns 400

Spend enough credits to go below a pack cost (e.g. open Test Pack Gamma twice to drop to ~0 credits from 300, then try Test Pack Alpha at 100).

**UI check:** The button label must change to "Not enough credits (need 100)" and become visually disabled (greyed out, cursor: not-allowed, not clickable).

**API check (curl):**

```
curl -s -X POST http://localhost:8080/api/packs/PACK_ID/open \
  -H "Authorization: Bearer TOKEN"
```

Expected (HTTP 400):

```json
{"error": "Insufficient credits"}
```

---

## Step 9 — Open without token returns 401

```
curl -s -X POST http://localhost:8080/api/packs/PACK_ID/open
```

Expected:

```json
{"error": "Missing or invalid token"}
```

---

## Step 10 — "Open Another" resets result and shows pack again

1. Open a pack (Step 5).
2. On the result overlay, click **Open Another**.
3. Overlay dismisses, pack detail page is visible again with the new credit balance.
4. Credits in header should reflect the updated balance (not the pre-open balance).

---

## Step 11 — "Back to Packs" navigates correctly

1. Open a pack.
2. On the result overlay, click **Back to Packs**.
3. Browser navigates to `/packs`.
4. Header still shows the updated (post-open) credit balance.

---

## Step 12 — Duplicate card increments quantity

Open several packs until you receive the same card twice. In Atlas Compass, filter inventory for that `card_id` — `quantity` should be 2 (not two separate documents).

This confirms the `upsert` with `$inc: { quantity: 1 }` is working correctly.

---

## All tests passing checklist

- [ ] `GET /api/packs` returns 3 packs, no `pool` field
- [ ] `GET /api/packs/<id>` returns pool with cards and chance_percent
- [ ] Packs page shows real pack names and costs (not "Pack Name Here")
- [ ] Clicking a pack navigates to `/pack?id=<real_id>`
- [ ] Pack detail page shows real name, image, card count, and pool carousel
- [ ] Clicking "Open for N credits" shows result overlay with 5 cards
- [ ] Header credit balance updates immediately after opening
- [ ] Inventory documents appear in Atlas after opening
- [ ] Button reads "Open for N credits" and is enabled when user can afford the pack
- [ ] Button reads "Not enough credits (need N)" and is disabled when user cannot afford it
- [ ] Insufficient credits returns 400 from API
- [ ] Opening without token returns 401
- [ ] "Open Another" dismisses overlay and keeps updated credits
- [ ] "Back to Packs" navigates to `/packs`
- [ ] Duplicate card increments `quantity` rather than creating a second document

If all 13 boxes are checked, Phase 1 is complete.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Packs page shows nothing / "Failed to load packs" | Backend not running | Start `python main.py` |
| Packs page shows nothing with no error | seed.py not run | Run `python seed.py` in BackEnd/ |
| Pack detail shows "Pack not found" | Navigated to `/pack` without `?id=` | Always navigate from the Packs list |
| Carousel shows but cards are blank | `image_url` path mismatch | Confirm files exist in `Frontend/public/imgs/` |
| Credits don't update in header after open | `updateUser` not called | Check Pack.jsx `handleOpen` calls `updateUser({ credits: res.data.credits_remaining })` |
| `random module` import error | Python path issue | Should not occur — `random` is stdlib; restart Flask |
| Inventory documents not appearing | Atlas write failing | Check Flask console for pymongo errors |
