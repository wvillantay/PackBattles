# PackBattles — Development Roadmap
**Based on:** PROJECT_AUDIT.md (June 6, 2026)  
**Assumption:** One part-time developer, ~15 hours/week  
**Estimated working weeks** are calculated at that pace

---

## Core Game Loop (What Must Work Before Anything Else)

```
Buy Pack → Open Pack → Get Cards → Enter Battle → Win/Lose Cards → Repeat
```

Every system in this project depends on this loop. Build in this order or you will constantly rewrite things.

---

## Dependency Map

```
MongoDB Collections
        │
        ├── User Auth (JWT)
        │       │
        │       ├── Protected Routes (frontend)
        │       │
        │       └── Inventory System
        │               │
        │               ├── Pack Opening ──────────── Payment
        │               │
        │               ├── Trade System
        │               │
        │               ├── Upgrade System
        │               │
        │               └── Battle System
        │                       │
        │                       ├── Matchmaking
        │                       │
        │                       ├── WebSocket (real-time)
        │                       │
        │                       └── Additional Battle Modes
        │
        └── Events / Admin (independent, lower priority)
```

**Hard rules:**
- Nothing works without the database
- No user features work without auth
- No battles work without inventory (you need cards to play)
- No inventory without pack opening
- Pack opening can ship without payment (use free starter credits for MVP)

---

## Phase 0 — Foundation
**Prerequisite for everything. Start here.**

### 0A: Database Setup
| Task | Hours |
|------|-------|
| Design MongoDB collections (users, cards, packs, inventory, battles) | 4 |
| Write collection schemas / validation rules | 3 |
| Wire PyMongo into Flask (uncomment and complete the existing stub) | 2 |
| Seed database with real card and pack data (minimum viable set — e.g. 20 cards, 3 pack types) | 6 |
| **Subtotal** | **15 hrs** |

### 0B: Authentication (replace the current fake auth)
| Task | Hours |
|------|-------|
| Add bcrypt or argon2 for password hashing | 2 |
| Implement JWT issuance on login (PyJWT or flask-jwt-extended) | 4 |
| Add auth middleware / decorator for protected routes | 3 |
| Store token in frontend (localStorage or httpOnly cookie) | 2 |
| Add auth context to React (so login state persists across pages) | 4 |
| Wire protected route wrapper — redirect to /login if no token | 3 |
| Fix CORS to allow only the frontend origin (not `*`) | 1 |
| Disable Flask `debug=True` for any shared/staging environment | 1 |
| **Subtotal** | **20 hrs** |

**Phase 0 Total: ~35 hours (~2.5 weeks)**  
**Unlocks:** Every subsequent phase

---

## Phase 1 — Pack Opening
**This is the primary monetizable action and feeds inventory.**

| Task | Hours |
|------|-------|
| Define rarity tiers and probability weights per pack type | 3 |
| Backend: POST `/api/packs/:id/open` — validate user credits, run probability roll, return card result, write to inventory | 6 |
| Backend: GET `/api/packs` — return real pack list from DB | 2 |
| Backend: GET `/api/packs/:id` — return pack detail with card odds | 2 |
| Frontend: wire Packs page to real API (replace PackCardData.js) | 3 |
| Frontend: wire Pack detail page to real API (replace hardcoded items) | 3 |
| Frontend: build pack opening animation/reveal sequence | 6 |
| Frontend: show result card with real name, image, rarity, value | 3 |
| Frontend: working search and sort on Packs page | 3 |
| **Phase 1 Total** | **~31 hrs (~2 weeks)** |

**Unlocks:** Inventory, Trade, Upgrade, Battles (all need cards)

---

## Phase 2 — Inventory System
**Required before battles, trading, or upgrading are meaningful.**

| Task | Hours |
|------|-------|
| Backend: GET `/api/inventory` — return authenticated user's cards | 3 |
| Backend: schema for owned cards (card ID, quantity, acquired date) | 2 |
| Frontend: build Inventory page (currently does not exist) | 8 |
| Frontend: wire Trade page to show actual user inventory in the left panel | 4 |
| Frontend: wire Upgrade page to show actual user inventory | 4 |
| **Phase 2 Total** | **~21 hrs (~1.5 weeks)** |

**Unlocks:** Trade, Upgrade, Battles

---

## Phase 3 — One Battle Mode (MVP Battles)
**Build one mode end-to-end before touching the others. Duel Battle is the simplest.**

| Task | Hours |
|------|-------|
| Install Flask-SocketIO (or move to a Node.js server) | 2 |
| Backend: POST `/api/battles` — create battle room, store in DB | 4 |
| Backend: POST `/api/battles/:id/join` — second player joins | 3 |
| Backend: GET `/api/battles` — return open battles list | 2 |
| Backend: Duel Battle game logic — compare card values, determine winner, transfer cards/credits | 6 |
| Backend: WebSocket events — `battle_start`, `round_update`, `battle_end` | 8 |
| Frontend: wire Battles lobby to real API (replace hardcoded table rows) | 4 |
| Frontend: working tab filters and search on battle lobby | 3 |
| Frontend: wire DuelBattle page to WebSocket (show real player, real cards, real progress) | 8 |
| Frontend: wire DuelBattleWinner page to real result data | 3 |
| Frontend: working "Start New Battle" flow with pack/card selection | 5 |
| Frontend: working "Join" and "Watch" buttons | 3 |
| **Phase 3 Total** | **~51 hrs (~3.5 weeks)** |

**Unlocks:** Playable MVP

---

## MVP Checkpoint
**After Phases 0–3 you have a playable game:**
- Users can register and log in (real auth)
- Users receive starter credits on signup (no payment required yet)
- Users can open packs and receive real cards
- Users own a real inventory
- Users can create and join Duel Battles
- One battle mode works end-to-end in real time

**Total hours to MVP: ~138 hrs (~9–10 weeks part-time)**

---

## Phase 4 — Payment Integration
**Required before charging real money. Do not go live without Phase 0–3 complete.**

| Task | Hours |
|------|-------|
| Choose and set up Stripe account + test keys | 2 |
| Install `stripe` Python library | 1 |
| Backend: POST `/api/payments/checkout` — create Stripe payment intent for pack purchase | 4 |
| Backend: POST `/api/payments/webhook` — handle Stripe webhook, credit user account on success | 5 |
| Frontend: install `@stripe/stripe-js` and `@stripe/react-stripe-js` | 1 |
| Frontend: build checkout flow on Pack detail page | 6 |
| Frontend: credit balance display in header | 3 |
| Test payment flow end-to-end in Stripe test mode | 4 |
| **Phase 4 Total** | **~26 hrs (~2 weeks)** |

**Unlocks:** Real monetization

---

## Phase 5 — Trade & Upgrade Systems
**These share the inventory foundation from Phase 2 and can be built in parallel.**

### 5A: Trade System
| Task | Hours |
|------|-------|
| Backend: POST `/api/trades` — propose a trade offer | 4 |
| Backend: POST `/api/trades/:id/accept` — validate both sides, swap cards | 5 |
| Backend: GET `/api/trades` — list open/pending trade offers | 2 |
| Frontend: wire Trade page inventory panel to real user cards | 3 |
| Frontend: card selection and trade offer flow | 5 |
| Frontend: incoming trade notification | 4 |
| **Subtotal** | **23 hrs** |

### 5B: Upgrade System
| Task | Hours |
|------|-------|
| Backend: POST `/api/upgrades` — consume input card, run probability, award result card | 5 |
| Backend: define upgrade multiplier probabilities (1.5x, 2x, 5x, 10x, 20x) | 3 |
| Frontend: wire Upgrade page to real user inventory | 3 |
| Frontend: wire multiplier buttons to real upgrade logic | 3 |
| Frontend: result animation | 4 |
| **Subtotal** | **18 hrs** |

**Phase 5 Total: ~41 hrs (~3 weeks)**

---

## Phase 6 — Additional Battle Modes
**Build on the WebSocket infrastructure from Phase 3. Each mode is faster than the first.**

| Mode | New Logic Required | Est. Hours |
|------|--------------------|-----------|
| Dice Roll | Random number gen, compare rolls | 12 |
| High Ball | Highest single card value wins | 10 |
| King of the Hill | Tournament bracket, multiple rounds, elimination | 20 |
| Low Ball (inverse High Ball) | 8 |
| King of the Hill Low Roll | Extends KotH logic | 8 |
| Spectate mode | Read-only WebSocket stream | 6 |

**Phase 6 Total: ~64 hrs (~4 weeks)**

---

## Phase 7 — Events, Admin & Polish
**Can be partially parallelized once Phase 3 is stable.**

### 7A: Event System
| Task | Hours |
|------|-------|
| Backend: CRUD endpoints for events | 5 |
| Frontend: wire Events page to real API | 3 |
| Frontend: working countdown timer using real event dates | 3 |
| Frontend: event sign-up flow | 4 |
| Frontend: leaderboard (referenced in Event tabs but not built) | 6 |
| **Subtotal** | **21 hrs** |

### 7B: Admin Panel
| Task | Hours |
|------|-------|
| Backend: admin role on user model + admin-only middleware | 3 |
| Backend: admin endpoints (manage users, packs, cards, events) | 10 |
| Frontend: basic admin dashboard page | 12 |
| **Subtotal** | **25 hrs** |

### 7C: Polish & Launch Prep
| Task | Hours |
|------|-------|
| Replace all Lorem ipsum copy with real content | 4 |
| Replace all placeholder images with real card/pack art | 6 |
| Fix footer nav links (all currently link nowhere) | 1 |
| Fix "More" header nav item | 1 |
| Fix `activeclassname` → `activeClassName` in Header | 0.5 |
| Fix duplicate Home page files | 0.5 |
| Fix scroll event listener memory leak in Header | 1 |
| Remove all `console.log` user data leaks | 1 |
| Fix copyright year (2023 → current) | 0.5 |
| Add email verification on signup | 5 |
| Add password reset / forgot password flow | 6 |
| Add user profile page | 8 |
| Error handling and user-facing error messages (currently only console.error) | 6 |
| Input validation (server-side, not just HTML types) | 4 |
| Rate limiting on auth endpoints | 2 |
| HTTPS + security headers | 2 |
| **Subtotal** | **~49 hrs** |

**Phase 7 Total: ~95 hrs (~6.5 weeks)**

---

## Full Timeline Summary

| Phase | What it delivers | Hours | Cumulative weeks |
|-------|-----------------|-------|-----------------|
| **0A** Database | Real data layer | 15 | Week 1 |
| **0B** Auth | Real login/signup | 20 | Week 2.5 |
| **1** Pack Opening | Core game action | 31 | Week 4.5 |
| **2** Inventory | Card ownership | 21 | Week 6 |
| **3** Duel Battle | **🏁 Playable MVP** | 51 | **Week 9.5** |
| **4** Payment | Monetization | 26 | Week 11.5 |
| **5** Trade & Upgrade | Feature complete | 41 | Week 14.5 |
| **6** More Battle Modes | Full game | 64 | Week 19 |
| **7** Events/Admin/Polish | Launch ready | 95 | **Week 25.5** |

**MVP (core loop playable): ~9–10 weeks part-time**  
**Full launch-ready product: ~25–26 weeks part-time (~6 months)**

---

## Fastest Path to Playable MVP

If the goal is to get something in front of real users as fast as possible:

1. **Skip payment in MVP** — give every new user a fixed credit balance on signup (e.g. 3 free pack opens). Add real payment in Phase 4 once the loop is proven.
2. **Skip King of the Hill, Dice Roll, High Ball for MVP** — ship Duel Battle only. The WebSocket infrastructure transfers to all other modes.
3. **Skip Trade and Upgrade for MVP** — they require inventory to be meaningful, and adding them too early complicates testing.
4. **Use a minimal card set** — 15–20 unique cards across 2–3 pack types is enough to validate the loop. Do not wait for a full card catalog.
5. **Do not build admin panel for MVP** — manage initial data directly in MongoDB Compass.

**The three questions MVP must answer:**
- Do users actually open packs? (pack opening)
- Do users actually battle? (matchmaking + Duel Battle)
- Do users come back? (inventory gives them a reason to return)

Everything else can be added after.

---

## What to Do First Thing Monday

1. Uncomment and complete the MongoDB connection in `main.py`
2. Design the five core collections: `users`, `cards`, `packs`, `inventory`, `battles`
3. Replace plaintext passwords with bcrypt
4. Issue a JWT on login and store it in the frontend

These four steps unblock every other task on this list.
