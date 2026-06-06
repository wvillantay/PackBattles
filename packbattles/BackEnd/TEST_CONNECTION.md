# Verify MongoDB Atlas Connectivity

Follow these steps exactly in order. Each step must pass before the next one is meaningful.

---

## Prerequisites

You need Python installed and a terminal open in `packbattles/BackEnd/`.

```
cd packbattles/BackEnd
```

---

## Step 1 — Install dependencies

```
pip install -r requirements.txt
```

Verify `python-dotenv` and `pymongo` are installed:

```
pip show python-dotenv pymongo
```

Both should print version info. If either says "not found", the install failed — check your pip version or try `pip3`.

---

## Step 2 — Confirm `.env` exists and is formatted correctly

```
type .env
```

You should see exactly two lines in this format:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/packbattles?retryWrites=true&w=majority&appName=<AppName>
JWT_SECRET=your-secret-here
```

**Common mistakes:**
- A bare URI with no `MONGO_URI=` prefix will be silently ignored by python-dotenv
- A space before or after the `=` breaks parsing
- Missing `/packbattles` before the `?` means flask-pymongo cannot find the database

---

## Step 3 — Confirm Atlas IP Allow List

In [MongoDB Atlas](https://cloud.mongodb.com):

1. Click your project → **Network Access** (left sidebar)
2. Confirm your current IP address appears in the list
3. If not, click **Add IP Address** → **Add Current IP Address** → **Confirm**

Without this, the connection will time out even with a correct URI.

---

## Step 4 — Run the ping test

Create a one-liner test (paste this directly into your terminal):

```
python -c "
import os
from dotenv import load_dotenv
from pymongo import MongoClient
load_dotenv()
uri = os.getenv('MONGO_URI')
if not uri:
    print('FAIL: MONGO_URI not found in .env')
else:
    try:
        c = MongoClient(uri, serverSelectionTimeoutMS=5000)
        c.admin.command('ping')
        print('OK: Connected to Atlas successfully')
        print('Databases:', c.list_database_names())
        c.close()
    except Exception as e:
        print('FAIL:', e)
"
```

**Expected output:**

```
OK: Connected to Atlas successfully
Databases: ['admin', 'local', 'packbattles']
```

`packbattles` will not appear until after `seed.py` has run at least once. `admin` and `local` appearing is enough to confirm connectivity.

**If you see a timeout error:**
- Your IP is not in the Atlas Allow List (Step 3)
- The cluster may be paused — log in to Atlas and check cluster status

**If you see an authentication error:**
- The username or password in your `.env` URI is wrong
- The database user may not have `readWrite` permissions — check Atlas → **Database Access**

---

## Step 5 — Run the seed script

Once the ping succeeds:

```
python seed.py
```

Expected output:

```
===================================================
  PackBattles — Database Seed
===================================================
Seeding cards (20 Pokemon test cards)...
  Inserted 20 cards
Seeding packs (3 test packs)...
  Inserted 3 packs
Ensuring indexes...
  All indexes ready

Summary:
  users:         0  (untouched)
  cards:        20
  packs:         3
  inventory:     0  (untouched)
  battles:       0  (untouched)

  common        8 cards
  uncommon      6 cards
  rare          4 cards
  ultra_rare    2 cards

Done. Start the Flask server:  python main.py
```

---

## Step 6 — Verify data in Atlas Compass (optional)

1. Open **MongoDB Compass**
2. Paste your `MONGO_URI` from `.env` into the connection field
3. Click **Connect**
4. Open database `packbattles` → collection `cards`
5. You should see 20 documents, all with `game: "Pokemon"`

---

## Step 7 — Start the Flask server

```
python main.py
```

Expected output:

```
 * Running on http://127.0.0.1:8080
 * Debug mode: on
```

No `MONGO_URI not set` error means the `.env` was loaded correctly.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `MONGO_URI not set` on startup | `.env` missing or malformed | Check Step 2 |
| `ServerSelectionTimeoutError` | IP not in Allow List | Check Step 3 |
| `Authentication failed` | Wrong credentials in URI | Re-copy URI from Atlas → Connect → Drivers |
| `pymongo.errors.ConfigurationError` | Missing `pymongo[srv]` | Run `pip install pymongo[srv]` |
| `ModuleNotFoundError: dotenv` | python-dotenv not installed | Run `pip install python-dotenv` |
| Compass shows empty `packbattles` | seed.py not run yet | Run Step 5 |
