# Test Auth Endpoints

Exact steps to verify Phase 0B Authentication is working end-to-end.
Run these in order. Every step must pass before the next one is meaningful.

---

## Prerequisites

- MongoDB Atlas connected (see TEST_CONNECTION.md)
- Dependencies installed: `pip install -r requirements.txt`
- `.env` contains `MONGO_URI` and `JWT_SECRET`

---

## Step 1 — Start the server

In `packbattles/BackEnd/`:

```
python main.py
```

Expected output:

```
 * Running on http://127.0.0.1:8080
 * Debug mode: on
```

If you see `MONGO_URI not set` or `JWT_SECRET not set`, fix `.env` first.

---

## Step 2 — Health check

```
curl http://localhost:8080/
```

Expected:

```json
{"status": "PackBattles API running"}
```

---

## Step 3 — Sign up a new user

```
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User\", \"email\": \"test@example.com\", \"password\": \"password123\"}"
```

**PowerShell equivalent:**

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/signup `
  -ContentType "application/json" `
  -Body '{"name": "Test User", "email": "test@example.com", "password": "password123"}'
```

Expected response (HTTP 201):

```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "credits": 300
  }
}
```

**Copy the `token` value** — you will use it in Steps 6 and 7.

---

## Step 4 — Confirm password is hashed in Atlas

1. Open MongoDB Compass → database `packbattles` → collection `users`
2. Find the document for `test@example.com`
3. Confirm:
   - `password_hash` starts with `$2b$` (bcrypt format) — NOT the raw password
   - `credits` is `300`
   - `wins` is `0`, `losses` is `0`
   - `created_at` is a timestamp

If `password_hash` equals `"password123"` the hash is broken. Stop and investigate.

---

## Step 5 — Signup validation checks

**Missing field (expect 400):**

```
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\"}"
```

Expected:

```json
{"error": "name, email, and password are required"}
```

**Password too short (expect 400):**

```
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"A\", \"email\": \"new@example.com\", \"password\": \"abc\"}"
```

Expected:

```json
{"error": "password must be at least 8 characters"}
```

**Duplicate email (expect 400):**

```
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User\", \"email\": \"test@example.com\", \"password\": \"password123\"}"
```

Expected:

```json
{"error": "Email already registered"}
```

---

## Step 6 — Login with correct credentials

```
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"password123\"}"
```

**PowerShell:**

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email": "test@example.com", "password": "password123"}'
```

Expected (HTTP 200):

```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "credits": 300
  }
}
```

---

## Step 7 — Login validation checks

**Wrong password (expect 401):**

```
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test@example.com\", \"password\": \"wrongpassword\"}"
```

Expected:

```json
{"error": "Invalid email or password"}
```

**Non-existent email (expect 401 — same message, no information leak):**

```
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"nobody@example.com\", \"password\": \"password123\"}"
```

Expected:

```json
{"error": "Invalid email or password"}
```

---

## Step 8 — GET /api/me with a valid token

Replace `YOUR_TOKEN` with the token from Step 3 or Step 6:

```
curl -s http://localhost:8080/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell:**

```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/me `
  -Headers @{ Authorization = "Bearer YOUR_TOKEN" }
```

Expected (HTTP 200):

```json
{
  "id": "...",
  "name": "Test User",
  "email": "test@example.com",
  "credits": 300,
  "wins": 0,
  "losses": 0
}
```

---

## Step 9 — GET /api/me without a token (expect 401)

```
curl -s http://localhost:8080/api/me
```

Expected:

```json
{"error": "Missing or invalid token"}
```

---

## Step 10 — GET /api/me with a bad token (expect 401)

```
curl -s http://localhost:8080/api/me \
  -H "Authorization: Bearer this.is.not.a.real.token"
```

Expected:

```json
{"error": "Invalid token"}
```

---

## All tests passing checklist

- [ ] Server starts without errors
- [ ] `GET /` returns `{"status": "PackBattles API running"}`
- [ ] `POST /api/auth/signup` returns 201 with token and user
- [ ] Atlas shows `password_hash` starting with `$2b$`, credits = 300
- [ ] Signup rejects missing fields (400)
- [ ] Signup rejects short password (400)
- [ ] Signup rejects duplicate email (400)
- [ ] `POST /api/auth/login` returns 200 with token and user
- [ ] Login rejects wrong password (401)
- [ ] Login rejects unknown email (401, same message — no leak)
- [ ] `GET /api/me` with valid token returns user data (200)
- [ ] `GET /api/me` without token returns 401
- [ ] `GET /api/me` with garbage token returns 401

If all 13 boxes are checked, Phase 0B is complete.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: bcrypt` | Missing install | `pip install bcrypt` |
| `ModuleNotFoundError: jwt` | Missing install | `pip install PyJWT` |
| `ModuleNotFoundError: bson` | Missing install | `pip install pymongo` |
| Token returns as `bytes` instead of string | Old PyJWT | `pip install --upgrade PyJWT` (v2+ returns str) |
| Atlas user not appearing in Compass | Compass showing cached view | Click the refresh icon on the collection |
| `ServerSelectionTimeoutError` on startup | Atlas IP not allowed | Add your IP in Atlas → Network Access |
