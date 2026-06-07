# Test Frontend Auth

Exact steps to verify Phase 0B frontend authentication end-to-end.
Run these in order. Every step must pass before moving on.

---

## Prerequisites

- Flask backend running on port 8080 (`python main.py` in `packbattles/BackEnd/`)
- Frontend dev server running (`npm run dev` in `packbattles/Frontend/`)
- A browser open at `http://localhost:5173` (or whatever port Vite reports)
- MongoDB Atlas connected and seed data loaded

---

## Step 1 — Protected routes redirect unauthenticated users

1. Open `http://localhost:5173/packs` while NOT logged in.
2. You should be immediately redirected to `/login`.
3. Repeat for `/battles`, `/pack`, `/duel-battle`, `/duel-battle-winner`.

Expected: browser URL changes to `/login` for each of these paths.

---

## Step 2 — Public routes remain accessible

1. Open `http://localhost:5173/` — should show the Home page.
2. Open `http://localhost:5173/login` — should show Log In form.
3. Open `http://localhost:5173/signup` — should show Sign Up form.

Expected: none of these redirect.

---

## Step 3 — Sign Up with valid data

1. Go to `/signup`.
2. Enter:
   - Name: `Test User`
   - Email: `testuser@example.com`
   - Password: `password123`
3. Click **Sign Up**.

Expected:
- Button shows "Signing up..." briefly.
- Browser redirects to `/packs`.
- Header shows `Test User · 300 credits` and a **Log Out** button.
- Log In / Sign Up links are gone.

---

## Step 4 — Sign Up client-side validation

1. Go to `/signup`.
2. Leave all fields blank → click **Sign Up**.

Expected: error banner "All fields are required."

3. Fill name + email, enter password `abc` → click **Sign Up**.

Expected: error banner "Password must be at least 8 characters."

---

## Step 5 — Sign Up server-side error (duplicate email)

1. Go to `/signup`.
2. Try to register `testuser@example.com` again (same email as Step 3).

Expected: error banner "Email already registered" (from the API).

---

## Step 6 — Log Out

1. While logged in (from Step 3), click **Log Out** in the header.

Expected:
- Browser navigates to `/`.
- Header shows **Log In** / **Sign Up** links again.
- `pb_token` is removed from localStorage.
  - Verify: open DevTools → Application → Local Storage → confirm `pb_token` is gone.

---

## Step 7 — Log In with correct credentials

1. Go to `/login`.
2. Enter email `testuser@example.com` / password `password123`.
3. Click **Log In**.

Expected:
- Redirects to `/packs`.
- Header shows `Test User · 300 credits`.

---

## Step 8 — Log In validation

1. Go to `/login`.
2. Leave fields blank → click **Log In**.

Expected: error banner "Email and password are required."

3. Enter correct email, wrong password → click **Log In**.

Expected: error banner "Invalid email or password" (from the API — same message for wrong email or wrong password).

---

## Step 9 — Token persists on page refresh

1. Log in (Step 7).
2. Hard refresh the page (Ctrl + Shift + R).

Expected:
- Still redirected to `/packs` (not kicked to `/login`).
- Header still shows user name and credits.
- `pb_token` still present in localStorage.

---

## Step 10 — Accessing protected route after login

1. While logged in, navigate directly to `http://localhost:5173/battles`.

Expected: Battles page loads (not redirected to `/login`).

---

## Step 11 — After logout, protected route redirects again

1. Log out (Step 6).
2. Try navigating to `/packs` directly.

Expected: redirected to `/login`.

---

## All tests passing checklist

- [ ] `/packs`, `/battles`, `/pack`, `/duel-battle`, `/duel-battle-winner` redirect to `/login` when not logged in
- [ ] `/`, `/login`, `/signup` remain accessible without auth
- [ ] Signup with valid data → redirected to `/packs`, header shows name + credits
- [ ] Signup with blank fields → client-side error shown
- [ ] Signup with short password → client-side error shown
- [ ] Signup with duplicate email → server error shown in UI
- [ ] Logout clears header state and removes `pb_token` from localStorage
- [ ] Login with valid credentials → redirected to `/packs`, header shows name + credits
- [ ] Login with blank fields → client-side error shown
- [ ] Login with wrong password → server error shown in UI ("Invalid email or password")
- [ ] Hard refresh while logged in → still authenticated, header intact
- [ ] Accessing protected route while logged in → page loads normally
- [ ] Accessing protected route after logout → redirected to `/login`

If all 13 boxes are checked, Phase 0B frontend is complete.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Network Error` on signup/login | Backend not running or wrong port | Confirm `python main.py` is running and listening on 8080 |
| Redirect loop on `/login` | `pb_token` in localStorage is malformed | Open DevTools → Application → Local Storage → delete `pb_token` manually |
| Header shows stale credits after opening packs | Credits not refetched after pack open | Expected for now — credits update in Step 9 (pack opening) |
| `useAuth` returns `null` | Component rendered outside `<AuthProvider>` | Confirm `<AuthProvider>` wraps the whole app in `App.jsx` |
| Page flashes `/login` then loads correctly | `loading` state momentarily true | Normal — `ProtectedRoute` renders `null` while verifying stored token |
