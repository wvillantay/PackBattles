# PackBattles — MVP Build Plan
**Created:** June 6, 2026  
**Reference docs:** PROJECT_AUDIT.md, ROADMAP.md  
**Goal:** Smallest possible playable game. Real users, real cards, real battles.

---

## What the MVP Is

A user can:
1. Create an account and log in securely
2. Receive starter credits on signup (no payment required)
3. Browse real packs and spend credits to open them
4. Receive real cards saved to their inventory
5. View their inventory
6. Create or join a Duel Battle using a card from their inventory
7. Win or lose — cards and credits transfer to the winner

That is the complete core loop. Everything else is post-MVP.

---

## Exact Features Included

| Feature | Scope |
|---------|-------|
| User registration | Name, email, password — bcrypt hashed, JWT returned |
| User login | Email + password, JWT returned, stored in frontend |
| Starter credits | 300 credits awarded automatically on signup |
| Auth context (React) | Token stored, login state persists across pages |
| Protected routes | Unauthenticated users redirected to /login |
| Credit balance in header | Shown when logged in |
| Pack list page | Real packs from database |
| Pack detail page | Real card pool shown, real cost, working "Open" button |
| Pack opening | Credits deducted, probability roll, card result saved to inventory |
| Pack opening result screen | Show the card(s) received with name, rarity, value |
| Inventory page (new) | Grid of all cards the user owns |
| Battle lobby | Real list of open Duel Battles from database |
| Create Duel Battle | Select a card from inventory, post to create |
| Join Duel Battle | Select a card from inventory, join resolves immediately |
| Duel Battle resolution | Higher value card wins, winner receives loser's card |
| Duel Battle result screen | Show winner, winning card, amount transferred |
| Wins/losses tracked | Stored on user record |

---

## Exact Features Excluded (Post-MVP)

| Excluded | Reason |
|----------|--------|
| Stripe / PayPal | Use free starter credits instead |
| Trade system | Needs inventory first; adds complexity |
| Upgrade system | Same dependency; adds complexity |
| Dice Roll battle mode | Build one mode completely first |
| High Ball battle mode | Same |
| King of the Hill | Same — also the most complex mode |
| Low Ball | Same |
| Spectate mode | Nice-to-have, no game logic needed yet |
| Events system | Independent feature, not core loop |
| Admin dashboard | Manage data directly in MongoDB Compass for now |
| Email verification | Adds friction to testing; add post-MVP |
| Password reset | Add post-MVP |
| User profile page | Add post-MVP |
| Leaderboard | Add post-MVP |
| WebSockets / real-time sync | Duel Battle resolves instantly on join — no polling needed for MVP |
| Search and filter | Packs and Battles pages will be small enough at MVP scale |
| Load More / pagination | Same |
| Social icons / testimonials | Not functional, leave as-is |
| Footer links | Leave broken for now |

---

## Database Collections

Five collections. Nothing more for MVP.

---

### Collection 1: `users`

```
{
  _id:            ObjectId  (auto)
  name:           String    (required)
  email:          String    (required, unique, indexed)
  password_hash:  String    (bcrypt hash — never store plaintext)
  credits:        Int       (default: 300 — starter balance)
  wins:           Int       (default: 0)
  losses:         Int       (default: 0)
  created_at:     DateTime  (auto)
}
```

---

### Collection 2: `cards`

Card definitions — what cards exist in the game. Not what any user owns.

```
{
  _id:        ObjectId  (auto)
  name:       String    (e.g. "Charizard", "Blue-Eyes White Dragon")
  image_url:  String    (path to card image in /public/imgs/)
  rarity:     String    (enum: "common" | "uncommon" | "rare" | "ultra_rare")
  value:      Float     (credit value, e.g. 50.00, 200.00, 500.00)
  game:       String    (enum: "Pokemon" | "Yugioh" | "Magic" | "Digimon")
}
```

Seed with a minimum of 20 cards across the four games, covering all rarity tiers.

---

### Collection 3: `packs`

Pack types users can purchase and open.

```
{
  _id:        ObjectId  (auto)
  name:       String    (e.g. "Pokemon Starter Pack")
  image_url:  String    (path to pack image)
  cost:       Int       (credits to open, e.g. 100)
  cards_per_open: Int   (how many cards granted per open, e.g. 5)
  pool: [
    {
      card_id: ObjectId  (ref: cards._id)
      weight:  Int       (probability weight — higher = more common)
    }
  ]
}
```

Seed with a minimum of 3 packs (one per franchise or one per rarity tier).

**Rarity weight example for a 100-point pool:**
- common cards → weight 50–60
- uncommon cards → weight 25–30
- rare cards → weight 10–15
- ultra_rare cards → weight 1–5

---

### Collection 4: `inventory`

Cards owned by users. One document per unique user+card combination.

```
{
  _id:          ObjectId  (auto)
  user_id:      ObjectId  (ref: users._id, indexed)
  card_id:      ObjectId  (ref: cards._id)
  quantity:     Int       (default: 1, increments if user gets same card again)
  acquired_at:  DateTime  (auto)
}
```

Index on `user_id` — this query runs on every inventory page load.

---

### Collection 5: `battles`

One document per battle. Resolves synchronously when player 2 joins — no WebSocket needed for MVP.

```
{
  _id:                     ObjectId  (auto)
  mode:                    String    (hardcoded "duel" for MVP)
  status:                  String    (enum: "waiting" | "active" | "complete")
  creator_id:              ObjectId  (ref: users._id)
  creator_card_id:         ObjectId  (ref: cards._id — the card they're wagering)
  creator_inventory_id:    ObjectId  (ref: inventory._id — to decrement/transfer)
  opponent_id:             ObjectId  (nullable until join)
  opponent_card_id:        ObjectId  (nullable until join)
  opponent_inventory_id:   ObjectId  (nullable until join)
  winner_id:               ObjectId  (nullable until resolved)
  credits_at_stake:        Float     (sum of both cards' values)
  created_at:              DateTime  (auto)
  resolved_at:             DateTime  (nullable)
}
```

---

## Backend API Endpoints

All endpoints return JSON. All protected endpoints require `Authorization: Bearer <token>` header.

---

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | None | Register new user |
| POST | `/api/auth/login` | None | Login, receive JWT |

**POST `/api/auth/signup`**
```
Request:  { name, email, password }
Validate: email is unique, password >= 8 chars
Action:   hash password, create user with credits=300, return JWT
Response: { token, user: { id, name, email, credits } }
Errors:   400 if email taken, 400 if missing fields
```

**POST `/api/auth/login`**
```
Request:  { email, password }
Action:   find user by email, bcrypt compare, issue JWT (expires 7d)
Response: { token, user: { id, name, email, credits } }
Errors:   401 if wrong credentials
```

---

### User

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/me` | Required | Get current user info |

**GET `/api/me`**
```
Response: { id, name, email, credits, wins, losses }
```

---

### Packs

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/packs` | None | List all packs |
| GET | `/api/packs/<id>` | None | Get one pack + card pool details |
| POST | `/api/packs/<id>/open` | Required | Open a pack, receive cards |

**GET `/api/packs`**
```
Response: [ { id, name, image_url, cost, cards_per_open } ]
```

**GET `/api/packs/<id>`**
```
Response: {
  id, name, image_url, cost, cards_per_open,
  pool: [ { card: { name, rarity, value }, chance_percent } ]
}
```

**POST `/api/packs/<id>/open`**
```
Auth:     Required
Validate: user.credits >= pack.cost
Action:   deduct credits, roll cards_per_open cards using weighted pool,
          upsert into inventory (increment quantity if duplicate),
          save updated credits
Response: {
  credits_remaining: int,
  cards_received: [ { card: { id, name, image_url, rarity, value } } ]
}
Errors:   400 if insufficient credits, 404 if pack not found
```

---

### Inventory

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/inventory` | Required | Get current user's cards |

**GET `/api/inventory`**
```
Response: [
  {
    inventory_id,
    quantity,
    acquired_at,
    card: { id, name, image_url, rarity, value, game }
  }
]
```

---

### Battles

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/battles` | None | List open Duel battles |
| POST | `/api/battles` | Required | Create a battle, wager a card |
| POST | `/api/battles/<id>/join` | Required | Join and resolve immediately |
| GET | `/api/battles/<id>` | None | Get one battle's state |

**GET `/api/battles`**
```
Response: [
  {
    id, status, credits_at_stake, created_at,
    creator: { name, avatar? },
    creator_card: { name, image_url, rarity, value }
  }
]
Filter:   only return status="waiting"
```

**POST `/api/battles`**
```
Auth:     Required
Request:  { inventory_id }   ← the inventory entry the user is wagering
Validate: inventory entry belongs to user, user does not already have an open battle
Action:   create battle document with status="waiting", lock the card
Response: { battle_id, status, credits_at_stake }
Errors:   400 if card not in inventory, 400 if already has open battle
```

**POST `/api/battles/<id>/join`**
```
Auth:     Required
Request:  { inventory_id }   ← the card this player is wagering
Validate: battle status="waiting", joiner != creator, card belongs to joiner
Action:
  1. Set opponent fields on battle
  2. Compare creator_card.value vs opponent_card.value
  3. Higher value wins (tie = creator wins for simplicity)
  4. Transfer loser's card to winner inventory (or add credits equivalent)
  5. Increment winner.wins, loser.losses
  6. Set battle.status = "complete", battle.winner_id, battle.resolved_at
Response: {
  winner_id,
  winner_name,
  winning_card: { name, image_url, value },
  losing_card: { name, image_url, value },
  credits_at_stake
}
Errors:   400 if battle not waiting, 403 if trying to join own battle
```

**GET `/api/battles/<id>`**
```
Response: full battle document with populated user and card fields
```

---

## Frontend Pages to Modify or Create

Only touch what is needed for MVP. Leave all other pages as static mockups.

---

### 1. App.jsx — Add auth context + protected routes

**What changes:**
- Remove the `FatchAPI()` call that hits `/api/users` on every render (it crashes if backend is down)
- Create `AuthContext` (React Context) to hold `{ user, token, login, logout }`
- Wrap the app in `<AuthProvider>`
- Create a `<ProtectedRoute>` component that redirects to `/login` if no token
- Wrap `/packs`, `/pack`, `/inventory`, `/battles`, `/duel-battle`, `/duel-battle-winner` in `<ProtectedRoute>`
- Add `/inventory` as a new route pointing to the new Inventory page

---

### 2. SignUp.jsx — Wire to real API

**What changes:**
- Replace `console.log(response.data)` with: store JWT in localStorage, call `login()` from AuthContext, redirect to `/packs`
- Replace `console.error` with visible error message shown in UI
- Add basic client-side validation: all fields required, password min 8 chars
- Add loading state on the Submit button

---

### 3. Login.jsx — Wire to real API

**What changes:**
- Replace `console.log(response.data)` with: store JWT, call `login()` from AuthContext, redirect to `/packs`
- Replace `console.error` with visible error message in UI
- Remove dead "Forgot your password?" link or replace `to="#"` with a note

---

### 4. Header.jsx — Show auth state

**What changes:**
- Read from AuthContext
- If logged in: show user name + credit balance, show "Log Out" button (calls `logout()`, clears token, redirects to `/`)
- If not logged in: show existing "Log In" / "Sign Up" links
- Fix the scroll event listener: move `window.addEventListener` inside `useEffect` with a cleanup to prevent memory leak

---

### 5. Packs.jsx — Load real packs from API

**What changes:**
- Remove `import { PackCardData }` 
- Replace with `useEffect` → `axios.get('/api/packs')` → `useState` for packs list
- Show loading state while fetching
- Pass real `id` from API result to `PackCard` so clicking navigates to `/pack?id=<id>`

---

### 6. Pack.jsx — Real detail + working Open button

**What changes:**
- Read pack `id` from URL query param (`useSearchParams`)
- Fetch `GET /api/packs/<id>` on mount → show real name, image, card pool
- Replace hardcoded carousel items with real cards from pool
- Wire "Unpack for $X" button → `POST /api/packs/<id>/open`
- After open: show result screen (overlay or new state) with the card(s) received
- Deduct credits locally (or refetch `/api/me`) and update header display
- Show error if insufficient credits

---

### 7. Inventory.jsx — New page (does not exist yet)

**Create from scratch.** Route: `/inventory`

**What it shows:**
- Page header: "My Inventory"
- Credit balance (pulled from AuthContext or `/api/me`)
- Grid of cards: image, name, rarity badge, value, quantity
- Empty state: "You have no cards yet. Open a pack to get started." with link to `/packs`
- Add `/inventory` link to the Header nav (where "More" currently is)

---

### 8. Battles.jsx — Real lobby list

**What changes:**
- Remove hardcoded table rows
- Fetch `GET /api/battles` on mount
- Render real battle rows with real creator name, card image, cost
- Wire "Join" button → navigate to `/duel-battle?id=<battle_id>` (join flow happens on that page)
- Wire "Start New Battle" button → navigate to `/duel-battle` with no ID (create flow)
- Remove non-Duel-Battle tabs for MVP (or disable them visually)

---

### 9. DuelBattle.jsx — Real create + join flow

**What changes:**
- Read URL param: if `?id=<id>` present → join flow; if no ID → create flow
- **Create flow:** Show user's inventory cards to select. On select → `POST /api/battles` → redirect to lobby or show "Waiting for opponent" state.
- **Join flow:** Show battle info (opponent's card) + user's inventory to pick from. On select → `POST /api/battles/<id>/join` → navigate to `/duel-battle-winner?id=<id>` with result data.
- Replace hardcoded "Player Name" / "Pack Name Here" with real data
- Replace hardcoded progress value (30) with real round data

---

### 10. DuelBattleWinner.jsx — Real result screen

**What changes:**
- Read result from location state (passed from DuelBattle on navigation) or fetch `GET /api/battles/<id>`
- Show real winner name, winning card, losing card, credits transferred
- Wire "Create New Battle" → navigate to `/duel-battle`
- Wire "Back to Battle List" → navigate to `/battles`

---

## Order of Implementation

Build strictly in this order. Each step unblocks the next.

```
Step 1   MongoDB setup + seed data
Step 2   Backend auth endpoints (signup, login)
Step 3   Frontend auth (AuthContext, wire SignUp + Login pages)
Step 4   Frontend Header auth state (show user / credits / logout)
Step 5   Backend GET /api/me
Step 6   Backend GET /api/packs + GET /api/packs/<id>
Step 7   Frontend Packs.jsx → real API
Step 8   Frontend Pack.jsx → real detail (read only, no open yet)
Step 9   Backend POST /api/packs/<id>/open
Step 10  Frontend Pack.jsx → wire Open button + result screen
Step 11  Backend GET /api/inventory
Step 12  Frontend Inventory.jsx (new page)
Step 13  Backend GET /api/battles + POST /api/battles
Step 14  Frontend Battles.jsx → real lobby + Start New Battle
Step 15  Backend POST /api/battles/<id>/join (battle resolution)
Step 16  Frontend DuelBattle.jsx → create + join flows
Step 17  Frontend DuelBattleWinner.jsx → real result screen
Step 18  Manual QA: full loop start to finish
```

Do not skip ahead. Step 10 cannot exist without Step 9. Step 16 cannot exist without Step 15. Steps 1–4 are the foundation for everything.

---

## First Coding Task

**Open `packbattles/BackEnd/main.py` and do exactly these four things:**

1. Delete the `dummy_users` list
2. Uncomment and update the MongoDB URI: `"mongodb://localhost:27017/packbattles"`
3. Add bcrypt import: `from bcrypt import hashpw, checkpw, gensalt`
4. Add PyJWT import: `import jwt` and set `app.config["SECRET_KEY"] = "change-this-in-production"`

Then rewrite `/api/signup` and `/api/login` to:
- Hash the password before saving
- Write the user to `mongo.db.users`
- Return a JWT on success

This single file change — replacing fake auth with real auth connected to real MongoDB — is the unlock for every other task. Nothing else is worth writing until these two endpoints are real.

---

## Seed Data Needed Before Frontend Work

Before Steps 6–8 are useful, insert at minimum:

**3 packs:**
- Pokemon Starter Pack (cost: 100 credits, 5 cards per open)
- Yugioh Classic Pack (cost: 150 credits, 5 cards per open)  
- Magic Rare Pack (cost: 200 credits, 5 cards per open)

**20 cards minimum (5 per rarity tier):**

| Rarity | Count | Value range |
|--------|-------|-------------|
| Common | 8 | 5 – 25 credits |
| Uncommon | 6 | 30 – 75 credits |
| Rare | 4 | 80 – 200 credits |
| Ultra Rare | 2 | 250 – 500 credits |

Use existing card images already in `/public/imgs/` for the initial seed. Real card art can be swapped in later without changing any code — just update the `image_url` field in the database.

---

## Starter Credit Math

A new user gets **300 credits**.

| Pack | Cost | Openable with 300 credits |
|------|------|--------------------------|
| Pokemon Starter | 100 | 3 times |
| Yugioh Classic | 150 | 2 times |
| Magic Rare | 200 | 1 time |

This gives new users enough to try the game without spending anything. After opening packs, they battle to win more cards. This is the loop.

---

## Definition of Done for MVP

The MVP is complete when a second person (not the developer) can:

1. Go to the site
2. Create an account
3. See their 300 starter credits
4. Browse the pack list
5. Open a pack and see real cards appear in their inventory
6. Go to the battle lobby and see open battles
7. Join a battle using one of their cards
8. See the winner screen with a real result
9. Check their inventory and see the card transferred (or not)

If a real user can complete those 9 steps without help, the MVP is done.
