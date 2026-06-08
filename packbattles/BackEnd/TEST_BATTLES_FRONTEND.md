# Phase 3 — Battles Frontend: Manual Test Plan

## Mechanic summary
Both players pay to open the **same pack type**.
Creator's draw is hidden until an opponent joins.
When the opponent joins, both draws are revealed simultaneously.
Higher total wins all drawn cards. Exact tie → server-side coin flip.

---

## Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running (Vite dev server)
- Two browser sessions — User A (create) and User B (join)
- Each user has enough credits to open at least one pack

---

## Step 1 — Battles page loads correctly

1. Log in as User A, navigate to `/battles`
2. Verify:
   - Page heading reads "Battles" (not Lorem ipsum)
   - No hardcoded rows visible
   - If no open battles exist: "No open battles right now — start one!" message shown
   - If battles exist: table has columns CREATOR / PACK / COST TO JOIN / ACTIONS

---

## Step 2 — "Start New Battle" opens the pack selector modal

1. Click "Start New Battle"
2. Verify:
   - Modal overlay appears with title "Start New Battle"
   - Hint text explains the hidden-draw mechanic
   - Pack tiles are displayed with: pack image, name, cost
   - No pack is pre-selected
   - "Create Battle" button is disabled

---

## Step 3 — Pack selection in create modal

1. Click a pack tile
2. Verify:
   - Tile gets a purple border (selected state)
   - Cost row appears: "Pack cost: X cr" and "Your credits: Y"
   - Credits shown in purple if affordable, red if not
   - "Create Battle" button becomes enabled (purple) when affordable
3. Click a different pack tile — verify only the new one is selected
4. If user cannot afford a pack, verify "Not enough credits" shown and button stays disabled

---

## Step 4 — Create battle succeeds

1. Select an affordable pack and click "Create Battle"
2. Verify:
   - Modal closes immediately
   - Battle list refreshes — new row appears with:
     - CREATOR = User A's name
     - PACK = selected pack name
     - COST TO JOIN = pack cost
     - ACTIONS = "Your battle" (not a Join button)
   - Header shows User A's credits reduced by pack cost

---

## Step 5 — Open battle does NOT reveal creator's cards

Confirm the battle list row shows only creator name, pack name, and cost.
No card images, no total value shown for the creator.

---

## Step 6 — Battle visible to other users

1. In a second browser window, log in as User B, navigate to `/battles`
2. Verify:
   - User A's battle appears
   - "Join" button is shown (purple)
   - Row shows pack name and cost — NOT User A's card draw

---

## Step 7 — "Join" opens the join confirmation modal

1. As User B, click "Join" on User A's battle
2. Verify:
   - Modal appears with title "Join Battle"
   - Opponent info shows User A's name and pack name
   - Hint text explains both-players-open-same-pack mechanic
   - Cost row shows entry cost and User B's current credits
   - "Join for X cr" button is enabled if User B can afford it

---

## Step 8 — Insufficient credits blocks join

If User B has fewer credits than the pack cost:
- Credits shown in red
- "Not enough credits." error shown
- "Join for X cr" button is disabled

---

## Step 9 — Join resolves and reveals both draws

1. As User B, click "Join for X cr" (User B must have enough credits)
2. Verify:
   - Modal closes
   - Full-screen result overlay appears with:
     - "You Won!" (purple gradient) or "You Lost" (grey) based on totals
     - Pack name shown as subtitle
     - Two side-by-side panels: User A's draw and User B's draw
     - Each panel shows: player name, total value in purple, all drawn cards with images and rarity badges
     - "Winner" label appears next to the winning player's name
     - If tiebreaker: "It was a tie — coin flip awarded victory to [name]" message shown
   - Header shows User B's credits reduced by pack cost

---

## Step 10 — Result overlay layout

Both sides shown simultaneously:
- Left side: creator's drawn cards + total
- Center: "VS" divider
- Right side: opponent's drawn cards + total
- Winner indicated by gold "Winner" label next to their name

---

## Step 11 — Close result and verify battle list

1. Click "Close" on the result overlay
2. Verify:
   - Overlay dismisses
   - User A's battle is no longer in the open battles list (it is completed)

---

## Step 12 — Winner's inventory updated

1. As the winner, navigate to `/inventory`
2. Verify: all drawn cards from **both** packs are present in the winner's inventory

---

## Step 13 — Loser receives no cards

1. As the loser, navigate to `/inventory`
2. Verify: none of the battle's drawn cards were added to the loser's inventory

---

## Step 14 — Creator sees "Your battle" label

1. As User A, navigate to `/battles` while their own battle is open
2. Verify: row shows "Your battle" in place of a "Join" button
3. Clicking the label does nothing

---

## Step 15 — Cancel does not charge credits

1. Open the create modal, select a pack, then click "Cancel"
2. Verify: User A's credits are unchanged; no battle was created

---

## Step 16 — Click outside modal closes it

1. Open the create or join modal
2. Click on the dark overlay area outside the modal box
3. Verify: modal closes; no action taken

---

## Step 17 — Error states

| Scenario | Expected |
|---|---|
| Backend down when page loads | "Failed to load battles..." message |
| Backend returns error on create | Error shown inside modal; modal stays open |
| Backend returns error on join | Error shown inside join modal; modal stays open |
| User has 0 credits | Pack cost row shows credits in red; Create/Join button disabled |

---

## Completion checklist

- [ ] `/battles` shows real API data — no hardcoded rows or Lorem ipsum
- [ ] Empty state shown when no open battles exist
- [ ] "Start New Battle" opens pack selector modal
- [ ] Pack tiles show name, image, cost
- [ ] Selecting a pack shows cost row with credit check
- [ ] Create button disabled until affordable pack selected
- [ ] Creating a battle deducts credits from creator
- [ ] New battle appears in list with CREATOR / PACK / COST columns
- [ ] Open battles do NOT show creator's drawn cards or total
- [ ] Creator's own battle shows "Your battle", not a Join button
- [ ] "Join" button visible to other users
- [ ] Join modal shows pack name, cost, and User B's credits
- [ ] Join button disabled if insufficient credits
- [ ] Joining deducts credits from opponent
- [ ] Result overlay shows both players' drawn cards side by side
- [ ] Winner clearly indicated (label + win/lose heading)
- [ ] Tiebreaker message shown on exact tie
- [ ] Battle disappears from open list after completion
- [ ] Winner's inventory receives all drawn cards from both packs
- [ ] Loser's inventory receives no battle cards
- [ ] Cancel/click-outside dismisses modal without charging credits
