# PackBattles — MVP Plan

---

## Phase 0 — Auth (complete)

**Backend**
- `POST /api/auth/signup` — register; bcrypt password; 300 starter credits
- `POST /api/auth/login` — validate; return JWT (7-day expiry)
- `GET /api/me` — return profile from Bearer token

**Frontend**
- `AuthContext` — `user`, `token`, `login`, `logout`, `updateUser`, `loading`
- JWT stored in `localStorage` key `pb_token`
- `ProtectedRoute` — redirects to `/login` if unauthenticated
- Header shows name + credits when logged in; Login/Sign Up when not
- SignUp.jsx and Login.jsx wired to real endpoints

---

## Phase 1 — Packs + Open Pack (complete)

**Backend**
- `GET /api/packs` — list all packs (excludes pool weights)
- `GET /api/packs/<id>` — pack detail with card pool + chance percentages
- `POST /api/packs/<id>/open` — deduct credits; draw cards using weighted random;
  upsert into inventory

**Frontend**
- Packs.jsx — real pack list from API
- Pack.jsx — detail page; open button; result overlay showing drawn cards

---

## Phase 2 — Inventory (complete)

**Backend**
- `GET /api/inventory` — return all cards owned by the logged-in user,
  sorted by rarity then name

**Frontend**
- Inventory.jsx — card grid with rarity badge, quantity badge, value

---

## Phase 3 — Duel Battle MVP (complete)

### Mechanic

1. A battle is created for a specific pack type.
2. **Creator pays for and opens that pack immediately** — draw stored hidden.
3. The open battle is listed publicly showing only: creator name, pack name, cost.
   The creator's drawn cards and total are **never revealed while the battle is open**.
4. Any other user can join by paying the same pack cost.
5. **Opponent's pack is drawn server-side** at join time.
6. Both draws are compared: **higher total card value wins**.
7. **Exact tie → server-side coin flip**; result stored in `tiebreaker` field.
8. **Winner receives all drawn cards** from both packs (upserted into inventory).
9. **Loser receives no cards** — their cards go directly to the winner.
10. Both draws are revealed simultaneously in the join response.
11. Battle is marked `completed`; `wins`/`losses` counters updated on both users.

### Backend endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/battles` | List open battles (hidden draws) |
| `POST` | `/api/battles` | Create battle — body: `{ pack_id }` |
| `GET`  | `/api/battles/<id>` | Battle detail (hidden while open, full when completed) |
| `POST` | `/api/battles/<id>/join` | Join + resolve; no body required |

### Frontend

- Battles.jsx — live list; "Start New Battle" → pack selector modal → create;
  "Join" → confirmation modal → result overlay showing both draws side by side

---

## Future phases (not in MVP)

- Spectate mode
- King of the Hill
- Dice Roll
- High Ball / Low Ball
- Trade
- Card Upgrade
- Payments / credit purchase
- WebSocket real-time battle resolution
- Admin panel
