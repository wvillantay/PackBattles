import hashlib
import os
import random
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_pymongo import PyMongo

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise SystemExit(
        "MONGO_URI not set. "
        "Create packbattles/BackEnd/.env — see TEST_CONNECTION.md."
    )

jwt_secret = os.getenv("JWT_SECRET")
if not jwt_secret:
    raise SystemExit(
        "JWT_SECRET not set. "
        "Add JWT_SECRET to packbattles/BackEnd/.env."
    )

app = Flask(__name__)
_cors_raw = os.getenv("CORS_ORIGINS", "*")
_cors_origins = _cors_raw.split(",") if "," in _cors_raw else _cors_raw
CORS(app, origins=_cors_origins)
app.config["MONGO_URI"] = mongo_uri
mongo = PyMongo(app)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def make_token(user_id):
    payload = {
        "user_id": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = header[7:]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        g.user_id = payload["user_id"]
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """
    Decorator that enforces admin access.

    Validates the JWT (401 on failure) and then reads is_admin directly
    from MongoDB (403 if missing or not True).  Admin status is never
    inferred from the token alone — always re-confirmed from the database.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Step 1 — valid JWT
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = header[7:]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        # Step 2 — is_admin confirmed from DB, never from JWT
        user = mongo.db.users.find_one(
            {"_id": ObjectId(payload["user_id"])},
            {"is_admin": 1},
        )
        if not user or user.get("is_admin") is not True:
            return jsonify({"error": "Admin access required"}), 403

        g.user_id = payload["user_id"]
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data     = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "name, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    result = mongo.db.users.insert_one({
        "name":          name,
        "email":         email,
        "password_hash": password_hash,
        "credits":       300,
        "wins":          0,
        "losses":        0,
        "created_at":    datetime.now(timezone.utc),
    })

    token = make_token(result.inserted_id)
    return jsonify({
        "token": token,
        "user": {
            "id":      str(result.inserted_id),
            "name":    name,
            "email":   email,
            "credits": 300,
        },
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = mongo.db.users.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = make_token(user["_id"])
    return jsonify({
        "token": token,
        "user": {
            "id":       str(user["_id"]),
            "name":     user["name"],
            "email":    user["email"],
            "credits":  user["credits"],
            "is_admin": user.get("is_admin", False) is True,
        },
    })


# ---------------------------------------------------------------------------
# Protected routes
# ---------------------------------------------------------------------------

@app.route("/api/me", methods=["GET"])
@require_auth
def me():
    user = mongo.db.users.find_one({"_id": ObjectId(g.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id":       str(user["_id"]),
        "name":     user["name"],
        "email":    user["email"],
        "credits":  user["credits"],
        "wins":     user["wins"],
        "losses":   user["losses"],
        "is_admin": user.get("is_admin", False) is True,
    })


# ---------------------------------------------------------------------------
# Pack routes
# ---------------------------------------------------------------------------

@app.route("/api/packs", methods=["GET"])
def get_packs():
    packs = list(mongo.db.packs.find({}, {"pool": 0}))
    return jsonify([
        {
            "id":             str(p["_id"]),
            "name":           p["name"],
            "image_url":      p["image_url"],
            "cost":           p["cost"],
            "cards_per_open": p["cards_per_open"],
        }
        for p in packs
    ])


@app.route("/api/packs/<pack_id>", methods=["GET"])
def get_pack(pack_id):
    try:
        oid = ObjectId(pack_id)
    except Exception:
        return jsonify({"error": "Invalid pack id"}), 400

    pack = mongo.db.packs.find_one({"_id": oid})
    if not pack:
        return jsonify({"error": "Pack not found"}), 404

    total_weight = sum(e["weight"] for e in pack["pool"])
    pool = []
    for entry in pack["pool"]:
        card = mongo.db.cards.find_one({"_id": entry["card_id"]})
        if card:
            pool.append({
                "card": {
                    "id":        str(card["_id"]),
                    "name":      card["name"],
                    "image_url": card["image_url"],
                    "rarity":    card["rarity"],
                    "value":     card["value"],
                },
                "weight":        entry["weight"],
                "chance_percent": round(entry["weight"] / total_weight * 100, 1),
            })

    return jsonify({
        "id":             str(pack["_id"]),
        "name":           pack["name"],
        "image_url":      pack["image_url"],
        "cost":           pack["cost"],
        "cards_per_open": pack["cards_per_open"],
        "pool":           pool,
    })


@app.route("/api/packs/<pack_id>/open", methods=["POST"])
@require_auth
def open_pack(pack_id):
    try:
        oid = ObjectId(pack_id)
    except Exception:
        return jsonify({"error": "Invalid pack id"}), 400

    pack = mongo.db.packs.find_one({"_id": oid})
    if not pack:
        return jsonify({"error": "Pack not found"}), 404

    # Atomically deduct credits only if the user has enough.
    # The filter {"credits": {"$gte": cost}} acts as the guard: if a parallel
    # request already consumed the balance, this returns None and we 400.
    # return_document=True gives the post-$inc value, so new_credits is exact.
    updated = mongo.db.users.find_one_and_update(
        {"_id": ObjectId(g.user_id), "credits": {"$gte": pack["cost"]}},
        {"$inc": {"credits": -pack["cost"]}},
        return_document=True,
        projection={"credits": 1},
    )
    if updated is None:
        return jsonify({"error": "Insufficient credits"}), 400

    new_credits = updated["credits"]

    pool        = pack["pool"]
    card_ids    = [e["card_id"] for e in pool]
    weights     = [e["weight"]  for e in pool]
    drawn_ids   = random.choices(card_ids, weights=weights, k=pack["cards_per_open"])
    drawn_cards = [mongo.db.cards.find_one({"_id": cid}) for cid in drawn_ids]

    _log_tx(g.user_id, "pack_open_spend", -pack["cost"], new_credits,
            "pack", oid, f"Opened {pack['name']}")

    now = datetime.now(timezone.utc)
    try:
        for card in drawn_cards:
            # user_id and card_id are already in the filter; MongoDB writes them
            # to the new document automatically on upsert-insert.  Repeating them
            # inside $setOnInsert creates a conflicting-path error that MongoDB
            # swallows silently (no exception raised, no document written).
            mongo.db.inventory.update_one(
                {"user_id": ObjectId(g.user_id), "card_id": card["_id"]},
                {
                    "$inc":         {"quantity": 1},
                    "$setOnInsert": {"acquired_at": now},
                },
                upsert=True,
            )
    except Exception as exc:
        return jsonify({"error": f"Inventory write failed: {exc}"}), 500

    return jsonify({
        "credits_remaining": new_credits,
        "cards_received": [
            {
                "id":        str(c["_id"]),
                "name":      c["name"],
                "image_url": c["image_url"],
                "rarity":    c["rarity"],
                "value":     c["value"],
            }
            for c in drawn_cards
        ],
    })


# ---------------------------------------------------------------------------
# Inventory routes
# ---------------------------------------------------------------------------

@app.route("/api/inventory", methods=["GET"])
@require_auth
def get_inventory():
    RARITY_ORDER = {"ultra_rare": 0, "rare": 1, "uncommon": 2, "common": 3}

    rows = list(mongo.db.inventory.find({"user_id": ObjectId(g.user_id)}))

    # Batch company_inventory lookup so we can compute can_ship without N+1 queries
    card_ids = [row["card_id"] for row in rows]
    ci_map = {}
    if card_ids:
        for entry in mongo.db.company_inventory.find({"card_id": {"$in": card_ids}}):
            ci_map[str(entry["card_id"])] = entry

    result = []
    for row in rows:
        card = mongo.db.cards.find_one({"_id": row["card_id"]})
        if card:
            ci       = ci_map.get(str(row["card_id"]), {})
            can_ship = bool(ci.get("fulfillable") and ci.get("available_quantity", 0) > 0)
            result.append({
                "inventory_id":      str(row["_id"]),
                "card_id":           str(card["_id"]),
                "name":              card["name"],
                "image_url":         card["image_url"],
                "rarity":            card["rarity"],
                "value":             card["value"],
                "quantity":          row["quantity"],
                "withdrawal_pending": row.get("withdrawal_pending", False),
                "can_ship":          can_ship,
            })

    result.sort(key=lambda x: (RARITY_ORDER.get(x["rarity"], 99), x["name"]))
    return jsonify(result)


# ---------------------------------------------------------------------------
# Battle routes  (Duel Battle MVP — pack-based)
# ---------------------------------------------------------------------------

BOT_NAMES = ["Rookie Bot", "Lucky Bot", "Collector Bot", "High Roller Bot", "Shadow Bot"]


def _draw_from_pack(pack):
    """
    Randomly draw cards from a pack's weighted pool.
    Returns (drawn_card_oids, drawn_card_docs, total_value).
    Does NOT deduct credits or touch inventory.
    """
    pool    = pack["pool"]
    ids     = [e["card_id"] for e in pool]
    weights = [e["weight"]  for e in pool]
    drawn   = random.choices(ids, weights=weights, k=pack["cards_per_open"])
    docs    = [mongo.db.cards.find_one({"_id": cid}) for cid in drawn]
    total   = sum(float(d["value"]) for d in docs if d)
    return drawn, docs, total


def _card_detail(card):
    return {
        "id":        str(card["_id"]),
        "name":      card["name"],
        "image_url": card["image_url"],
        "rarity":    card["rarity"],
        "value":     card["value"],
    }


def _log_tx(user_id, tx_type, amount, balance_after, ref_type, ref_id, note):
    """
    Append one credit event to credit_transactions.
    Failures are swallowed — the log must never block a credit action.
    """
    try:
        mongo.db.credit_transactions.insert_one({
            "user_id":       ObjectId(str(user_id)),
            "type":          tx_type,
            "amount":        amount,
            "balance_after": balance_after,
            "ref_type":      ref_type,
            "ref_id":        ObjectId(str(ref_id)),
            "note":          note,
            "created_at":    datetime.now(timezone.utc),
        })
    except Exception:
        pass  # audit log failure must never surface to the caller


@app.route("/api/battles", methods=["GET"])
@require_auth
def list_battles():
    """
    Open battles — creator's draw is deliberately hidden.
    Only exposes: id, creator name, pack name, pack cost.
    """
    battles = list(
        mongo.db.battles.find({"status": "open"})
        .sort("created_at", -1)
        .limit(50)
    )
    result = []
    for b in battles:
        creator = mongo.db.users.find_one({"_id": b["creator_id"]}, {"name": 1})
        pack    = mongo.db.packs.find_one({"_id": b["pack_id"]},    {"name": 1, "cost": 1})
        qty = b.get("pack_quantity", 1)
        result.append({
            "id":            str(b["_id"]),
            "creator_id":    str(b["creator_id"]),
            "creator_name":  creator["name"] if creator else "Unknown",
            "pack_id":       str(b["pack_id"]),
            "pack_name":     pack["name"]    if pack    else "Unknown",
            "pack_cost":     pack["cost"]    if pack    else 0,
            "pack_quantity": qty,
            "total_cost":    (pack["cost"] if pack else 0) * qty,
            "created_at":    b["created_at"].isoformat(),
        })
    return jsonify(result)


@app.route("/api/battles", methods=["POST"])
@require_auth
def create_battle():
    """
    Create an open Duel Battle for a specific pack type.
    The creator pays for and opens that pack immediately; their draw is stored
    server-side and kept hidden until an opponent joins.
    """
    data    = request.get_json(silent=True) or {}
    pack_id = data.get("pack_id", "")

    if not pack_id:
        return jsonify({"error": "pack_id is required"}), 400

    try:
        pack_oid = ObjectId(pack_id)
    except Exception:
        return jsonify({"error": "Invalid pack_id"}), 400

    pack = mongo.db.packs.find_one({"_id": pack_oid})
    if not pack:
        return jsonify({"error": "Pack not found"}), 404

    try:
        pack_quantity = int(data.get("pack_quantity", 1))
    except (TypeError, ValueError):
        pack_quantity = 0
    if pack_quantity not in {1, 2, 3, 5, 10}:
        return jsonify({"error": "pack_quantity must be 1, 2, 3, 5, or 10"}), 400

    total_cost = pack["cost"] * pack_quantity

    creator_id = ObjectId(g.user_id)

    # Atomically deduct credits only if the creator has enough.
    # The $gte filter is the guard: a parallel request that already consumed
    # the balance will find no matching document and return None → 400.
    # return_document=True gives the post-$inc balance, so the log is exact.
    updated = mongo.db.users.find_one_and_update(
        {"_id": creator_id, "credits": {"$gte": total_cost}},
        {"$inc": {"credits": -total_cost}},
        return_document=True,
        projection={"credits": 1},
    )
    if updated is None:
        return jsonify({"error": "Insufficient credits"}), 400

    new_credits = updated["credits"]

    # Draw pack_quantity packs for the creator — stored hidden until battle resolves.
    # Drawing happens after the deduction is committed.
    all_drawn_ids = []
    creator_total  = 0.0
    for _ in range(pack_quantity):
        ids, _docs, subtotal = _draw_from_pack(pack)
        all_drawn_ids.extend(ids)
        creator_total += subtotal

    now    = datetime.now(timezone.utc)
    result = mongo.db.battles.insert_one({
        "type":           "duel",
        "status":         "open",
        "pack_id":        pack_oid,
        "pack_cost":      pack["cost"],
        "pack_quantity":  pack_quantity,
        "creator_id":     creator_id,
        "creator_cards":  all_drawn_ids,
        "creator_total":  creator_total,
        "opponent_id":    None,
        "opponent_cards": None,
        "opponent_total": None,
        "winner_id":      None,
        "tiebreaker":     None,
        "created_at":     now,
        "completed_at":   None,
    })

    _log_tx(creator_id, "battle_create_spend", -total_cost,
            new_credits,
            "battle", result.inserted_id, f"Created battle: {pack['name']} ×{pack_quantity}")

    # Return only metadata — creator's draw is intentionally omitted
    return jsonify({
        "id":            str(result.inserted_id),
        "status":        "open",
        "creator_id":    str(creator_id),
        "pack_id":       str(pack_oid),
        "pack_name":     pack["name"],
        "pack_cost":     pack["cost"],
        "pack_quantity": pack_quantity,
        "total_cost":    total_cost,
        "created_at":    now.isoformat(),
    }), 201


@app.route("/api/battles/<battle_id>", methods=["GET"])
@require_auth
def get_battle(battle_id):
    """
    Fetch a single battle.
    While status == 'open': creator's draw is hidden.
    While status == 'completed': both draws and the winner are revealed.
    """
    try:
        bid = ObjectId(battle_id)
    except Exception:
        return jsonify({"error": "Invalid battle id"}), 400

    battle = mongo.db.battles.find_one({"_id": bid})
    if not battle:
        return jsonify({"error": "Battle not found"}), 404

    pack = mongo.db.packs.find_one({"_id": battle["pack_id"]}, {"name": 1, "cost": 1})

    qty     = battle.get("pack_quantity", 1)
    creator = mongo.db.users.find_one({"_id": battle["creator_id"]}, {"name": 1})
    base = {
        "id":            str(battle["_id"]),
        "type":          battle["type"],
        "status":        battle["status"],
        "pack_id":       str(battle["pack_id"]),
        "pack_name":     pack["name"] if pack else "Unknown",
        "pack_cost":     pack["cost"] if pack else 0,
        "pack_quantity": qty,
        "total_cost":    (pack["cost"] if pack else 0) * qty,
        "creator_id":    str(battle["creator_id"]),
        "creator_name":  creator["name"] if creator else "Unknown",
        "created_at":    battle["created_at"].isoformat(),
    }

    if battle["status"] == "completed":
        is_bot = battle.get("is_bot_battle", False)
        if is_bot:
            opponent_name = battle.get("bot_name", "Bot")
        else:
            opp_user = mongo.db.users.find_one({"_id": battle["opponent_id"]}, {"name": 1})
            opponent_name = opp_user["name"] if opp_user else "Unknown"

        w_id = battle.get("winner_id")
        if is_bot:
            winner_side = "creator" if w_id else "bot"
        else:
            winner_side = "creator" if w_id == battle["creator_id"] else "opponent"

        base.update({
            "creator_total":  battle["creator_total"],
            "creator_cards":  [_card_detail(mongo.db.cards.find_one({"_id": cid}))
                               for cid in battle["creator_cards"]],
            "opponent_id":    str(battle["opponent_id"]) if battle.get("opponent_id") else None,
            "opponent_name":  opponent_name,
            "opponent_total": battle["opponent_total"],
            "opponent_cards": [_card_detail(mongo.db.cards.find_one({"_id": cid}))
                               for cid in battle["opponent_cards"]],
            "winner_id":      str(w_id) if w_id else None,
            "winner_side":    winner_side,
            "tiebreaker":     battle.get("tiebreaker"),
            "completed_at":   battle["completed_at"].isoformat(),
            "bot_battle":     is_bot,
            "bot_name":       battle.get("bot_name"),
        })

    return jsonify(base)


@app.route("/api/battles/<battle_id>/join", methods=["POST"])
@require_auth
def join_battle(battle_id):
    """
    Join an open Duel Battle:
      1. Opponent pays for and opens the same pack.
      2. Both draws are compared (higher total wins).
      3. Exact tie → server-side coin flip.
      4. Winner receives all drawn cards from both packs.
      5. Full result (both draws revealed simultaneously) is returned.
    """
    try:
        bid = ObjectId(battle_id)
    except Exception:
        return jsonify({"error": "Invalid battle id"}), 400

    battle = mongo.db.battles.find_one({"_id": bid})
    if not battle:
        return jsonify({"error": "Battle not found"}), 404
    if battle["status"] != "open":
        return jsonify({"error": "Battle is already completed"}), 400

    opponent_id = ObjectId(g.user_id)
    if battle["creator_id"] == opponent_id:
        return jsonify({"error": "You cannot join your own battle"}), 400

    pack = mongo.db.packs.find_one({"_id": battle["pack_id"]})
    if not pack:
        return jsonify({"error": "Pack no longer exists"}), 404

    pack_quantity = battle.get("pack_quantity", 1)
    total_cost    = pack["cost"] * pack_quantity

    # Draw opponent's packs and resolve the winner before entering the
    # transaction — pure computation, no DB writes, safe to discard on failure.
    opp_drawn_ids  = []
    opp_drawn_docs = []
    opponent_total = 0.0
    for _ in range(pack_quantity):
        ids, docs, subtotal = _draw_from_pack(pack)
        opp_drawn_ids.extend(ids)
        opp_drawn_docs.extend(docs)
        opponent_total += subtotal

    creator_total = battle["creator_total"]
    tiebreaker    = None

    if creator_total > opponent_total:
        winner_id = battle["creator_id"]
    elif opponent_total > creator_total:
        winner_id = opponent_id
    else:
        flip       = random.choice(["creator", "opponent"])
        tiebreaker = flip
        winner_id  = battle["creator_id"] if flip == "creator" else opponent_id

    loser_id = opponent_id if winner_id == battle["creator_id"] else battle["creator_id"]
    now      = datetime.now(timezone.utc)

    # Atomic: claim the battle and deduct opponent credits in one transaction.
    #
    #   Step 1 — battle claim: update_one with {"status": "open"} in the filter.
    #            Two concurrent joiners can never both get matched_count == 1.
    #            The full result is written here so the battle is immediately
    #            consistent if the transaction commits.
    #
    #   Step 2 — credit deduction: find_one_and_update with $gte guard.
    #            If the opponent has insufficient credits, RuntimeError is raised,
    #            the transaction aborts, and the battle claim from Step 1 is
    #            rolled back — the battle returns to "open" for others.
    #
    # Any other exception is a genuine DB error → 500.
    battle_taken         = False
    insufficient_credits = False
    new_credits          = None
    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                claim = mongo.db.battles.update_one(
                    {"_id": bid, "status": "open"},
                    {"$set": {
                        "status":         "completed",
                        "opponent_id":    opponent_id,
                        "opponent_cards": opp_drawn_ids,
                        "opponent_total": opponent_total,
                        "winner_id":      winner_id,
                        "tiebreaker":     tiebreaker,
                        "completed_at":   now,
                    }},
                    session=session,
                )
                if claim.matched_count == 0:
                    battle_taken = True
                    raise RuntimeError("battle_taken")

                credit_update = mongo.db.users.find_one_and_update(
                    {"_id": opponent_id, "credits": {"$gte": total_cost}},
                    {"$inc": {"credits": -total_cost}},
                    return_document=True,
                    projection={"credits": 1},
                    session=session,
                )
                if credit_update is None:
                    insufficient_credits = True
                    raise RuntimeError("insufficient_credits")

                new_credits = credit_update["credits"]
    except Exception:
        if battle_taken:
            return jsonify({"error": "Battle is no longer available — it may have just been joined or cancelled"}), 400
        if insufficient_credits:
            return jsonify({"error": "Insufficient credits"}), 400
        return jsonify({"error": "Failed to join battle. Please try again."}), 500

    # Transaction committed — opponent paid, battle is resolved.
    # Inventory, win/loss tallies, and the credit log are written outside the
    # transaction: they are idempotent / append-only and do not affect the
    # credit-safety or exclusivity guarantees above.
    all_cards = battle["creator_cards"] + opp_drawn_ids
    for cid in all_cards:
        mongo.db.inventory.update_one(
            {"user_id": winner_id, "card_id": cid},
            {
                "$inc":         {"quantity": 1},
                "$setOnInsert": {"acquired_at": now},
            },
            upsert=True,
        )

    mongo.db.users.update_one({"_id": winner_id}, {"$inc": {"wins":   1}})
    mongo.db.users.update_one({"_id": loser_id},  {"$inc": {"losses": 1}})

    _log_tx(opponent_id, "battle_join_spend", -total_cost,
            new_credits,
            "battle", bid, f"Joined battle: {pack['name']} ×{pack_quantity}")

    # Build full card detail lists for the simultaneous reveal
    creator_card_details  = [
        _card_detail(mongo.db.cards.find_one({"_id": cid}))
        for cid in battle["creator_cards"]
    ]
    opponent_card_details = [_card_detail(d) for d in opp_drawn_docs if d]

    creator  = mongo.db.users.find_one({"_id": battle["creator_id"]}, {"name": 1})
    opp_user = mongo.db.users.find_one({"_id": opponent_id},           {"name": 1})

    return jsonify({
        "id":             str(bid),
        "status":         "completed",
        "pack_id":        str(battle["pack_id"]),
        "pack_name":      pack["name"],
        "pack_cost":      pack["cost"],
        "pack_quantity":  pack_quantity,
        "total_cost":     total_cost,
        "creator_id":     str(battle["creator_id"]),
        "creator_name":   creator["name"]  if creator  else "Unknown",
        "creator_total":  creator_total,
        "creator_cards":  creator_card_details,
        "opponent_id":    str(opponent_id),
        "opponent_name":  opp_user["name"] if opp_user else "Unknown",
        "opponent_total": opponent_total,
        "opponent_cards": opponent_card_details,
        "winner_id":      str(winner_id),
        "winner_side":    "creator" if winner_id == battle["creator_id"] else "opponent",
        "tiebreaker":     tiebreaker,
        "completed_at":   now.isoformat(),
        "bot_battle":     False,
        "bot_name":       None,
    })


# ---------------------------------------------------------------------------
# Bot-join battle
# ---------------------------------------------------------------------------

@app.route("/api/battles/<battle_id>/bot-join", methods=["POST"])
@require_auth
def bot_join_battle(battle_id):
    """
    Resolve an open battle against a bot (creator only).
    Bot draws using the exact same _draw_from_pack logic as a real opponent.
    No credits deducted from anyone. No bot inventory.
    Race-safe: atomic status update means only the first valid action
    (human join, cancel, or bot-join) claims the open battle.
    """
    try:
        bid = ObjectId(battle_id)
    except Exception:
        return jsonify({"error": "Invalid battle id"}), 400

    battle = mongo.db.battles.find_one({"_id": bid})
    if not battle:
        return jsonify({"error": "Battle not found"}), 404
    if str(battle["creator_id"]) != g.user_id:
        return jsonify({"error": "Only the creator can trigger a bot battle"}), 403
    if battle["status"] != "open":
        return jsonify({"error": "Only open battles can be bot-joined"}), 400

    pack = mongo.db.packs.find_one({"_id": battle["pack_id"]})
    if not pack:
        return jsonify({"error": "Pack no longer exists"}), 404

    pack_quantity = battle.get("pack_quantity", 1)
    bot_name      = random.choice(BOT_NAMES)

    # Draw packs for the bot — identical to join_battle, no credit deduction
    bot_drawn_ids  = []
    bot_drawn_docs = []
    bot_total      = 0.0
    for _ in range(pack_quantity):
        ids, docs, subtotal = _draw_from_pack(pack)
        bot_drawn_ids.extend(ids)
        bot_drawn_docs.extend(docs)
        bot_total += subtotal

    creator_total = battle["creator_total"]
    creator_oid   = battle["creator_id"]
    now           = datetime.now(timezone.utc)
    tiebreaker    = None

    if creator_total > bot_total:
        creator_wins = True
    elif bot_total > creator_total:
        creator_wins = False
    else:
        flip         = random.choice(["creator", "bot"])
        tiebreaker   = flip
        creator_wins = (flip == "creator")

    winner_id   = creator_oid if creator_wins else None
    winner_side = "creator"   if creator_wins else "bot"
    all_cards   = battle["creator_cards"] + bot_drawn_ids

    # Atomic claim — if a human joined or cancel ran first, matched_count == 0
    result = mongo.db.battles.update_one(
        {"_id": bid, "status": "open", "creator_id": creator_oid},
        {"$set": {
            "status":         "completed",
            "is_bot_battle":  True,
            "bot_name":       bot_name,
            "opponent_id":    None,
            "opponent_cards": bot_drawn_ids,
            "opponent_total": bot_total,
            "winner_id":      winner_id,
            "tiebreaker":     tiebreaker,
            "completed_at":   now,
        }},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Battle could not be resolved — it may have already been joined or cancelled"}), 400

    if creator_wins:
        for cid in all_cards:
            mongo.db.inventory.update_one(
                {"user_id": creator_oid, "card_id": cid},
                {
                    "$inc":         {"quantity": 1},
                    "$setOnInsert": {"acquired_at": now},
                },
                upsert=True,
            )
        mongo.db.users.update_one({"_id": creator_oid}, {"$inc": {"wins": 1}})
    else:
        mongo.db.users.update_one({"_id": creator_oid}, {"$inc": {"losses": 1}})

    creator             = mongo.db.users.find_one({"_id": creator_oid}, {"name": 1})
    creator_card_details = [
        _card_detail(mongo.db.cards.find_one({"_id": cid}))
        for cid in battle["creator_cards"]
    ]
    bot_card_details = [_card_detail(d) for d in bot_drawn_docs if d]

    return jsonify({
        "id":             str(bid),
        "status":         "completed",
        "pack_id":        str(battle["pack_id"]),
        "pack_name":      pack["name"],
        "pack_cost":      pack["cost"],
        "pack_quantity":  pack_quantity,
        "total_cost":     pack["cost"] * pack_quantity,
        "creator_id":     str(creator_oid),
        "creator_name":   creator["name"] if creator else "Unknown",
        "creator_total":  creator_total,
        "creator_cards":  creator_card_details,
        "opponent_id":    None,
        "opponent_name":  bot_name,
        "opponent_total": bot_total,
        "opponent_cards": bot_card_details,
        "winner_id":      str(winner_id) if winner_id else None,
        "winner_side":    winner_side,
        "tiebreaker":     tiebreaker,
        "completed_at":   now.isoformat(),
        "bot_battle":     True,
        "bot_name":       bot_name,
    })


# ---------------------------------------------------------------------------
# Cancel battle
# ---------------------------------------------------------------------------

@app.route("/api/battles/<battle_id>/cancel", methods=["POST"])
@require_auth
def cancel_battle(battle_id):
    """
    Cancel an open Duel Battle (creator only).
    Uses a MongoDB transaction: battle status and credit refund are committed
    atomically — either both succeed or neither persists.
    """
    try:
        bid = ObjectId(battle_id)
    except Exception:
        return jsonify({"error": "Invalid battle id"}), 400

    battle = mongo.db.battles.find_one({"_id": bid})
    if not battle:
        return jsonify({"error": "Battle not found"}), 404
    if str(battle["creator_id"]) != g.user_id:
        return jsonify({"error": "Only the creator can cancel this battle"}), 403
    if battle["status"] != "open":
        return jsonify({"error": "Only open battles can be cancelled"}), 400

    total_cost  = battle["pack_cost"] * battle.get("pack_quantity", 1)
    creator_oid = battle["creator_id"]
    now         = datetime.now(timezone.utc)

    # blocked = True means the battle was already claimed by a concurrent join;
    # any other exception is a genuine DB error.
    blocked = False
    try:
        with mongo.cx.start_session() as session:
            with session.start_transaction():
                result = mongo.db.battles.update_one(
                    {"_id": bid, "status": "open", "creator_id": creator_oid},
                    {"$set": {"status": "cancelled", "cancelled_at": now}},
                    session=session,
                )
                if result.matched_count == 0:
                    blocked = True
                    raise RuntimeError("blocked")
                mongo.db.users.update_one(
                    {"_id": creator_oid},
                    {"$inc": {"credits": total_cost}},
                    session=session,
                )
    except Exception:
        if blocked:
            return jsonify({"error": "Battle could not be cancelled — it may have just been joined"}), 400
        return jsonify({"error": "Cancel failed; please try again"}), 500

    # Transaction committed — read actual post-refund balance for the log.
    creator_now = mongo.db.users.find_one({"_id": creator_oid}, {"credits": 1})
    _log_tx(creator_oid, "battle_cancel_refund", total_cost,
            creator_now["credits"] if creator_now else None,
            "battle", bid, f"Cancelled battle: refund of {total_cost} cr")

    return jsonify({"status": "cancelled", "credits_refunded": total_cost})


# ---------------------------------------------------------------------------
# User battle history
# ---------------------------------------------------------------------------

@app.route("/api/me/battles", methods=["GET"])
@require_auth
def my_battles():
    uid = ObjectId(g.user_id)
    raw = list(
        mongo.db.battles.find(
            {
                "status": {"$in": ["completed", "cancelled"]},
                "$or":    [{"creator_id": uid}, {"opponent_id": uid}],
            }
        )
        .sort("created_at", -1)
        .limit(20)
    )

    result = []
    for b in raw:
        # Defensive reads — old battle documents may be missing fields.
        pack_id    = b.get("pack_id")
        pack       = mongo.db.packs.find_one({"_id": pack_id}, {"name": 1, "cost": 1}) if pack_id else None
        pack_name  = pack["name"] if pack else "Unknown Pack"
        qty        = b.get("pack_quantity", 1)
        total_cost = b.get("pack_cost", 0) * qty
        status     = b.get("status", "unknown")
        creator_id = b.get("creator_id")
        is_creator = (creator_id == uid) if creator_id else False
        is_bot     = b.get("is_bot_battle", False)

        if status == "cancelled":
            result_label  = "cancelled"
            opponent_name = None
            my_total      = None
            their_total   = None
        else:
            if is_bot:
                opponent_name = b.get("bot_name", "Bot")
            elif is_creator:
                opp = mongo.db.users.find_one({"_id": b["opponent_id"]}, {"name": 1}) \
                      if b.get("opponent_id") else None
                opponent_name = opp["name"] if opp else "Unknown"
            else:
                creator = mongo.db.users.find_one({"_id": creator_id}, {"name": 1}) \
                          if creator_id else None
                opponent_name = creator["name"] if creator else "Unknown"

            winner_id    = b.get("winner_id")
            result_label = "win" if (winner_id and str(winner_id) == g.user_id) else "loss"

            if is_creator:
                my_total    = b.get("creator_total")
                their_total = b.get("opponent_total")
            else:
                my_total    = b.get("opponent_total")
                their_total = b.get("creator_total")

        result.append({
            "id":            str(b["_id"]),
            "status":        status,
            "pack_name":     pack_name,
            "pack_quantity": qty,
            "total_cost":    total_cost,
            "opponent_name": opponent_name,
            "result":        result_label,
            "my_total":      my_total,
            "their_total":   their_total,
            "is_bot_battle": is_bot,
            "completed_at":  b["completed_at"].isoformat() if b.get("completed_at") else None,
            "cancelled_at":  b["cancelled_at"].isoformat() if b.get("cancelled_at") else None,
        })

    return jsonify(result)


@app.route("/api/me/transactions", methods=["GET"])
@require_auth
def my_transactions():
    uid = ObjectId(g.user_id)
    raw = list(
        mongo.db.credit_transactions.find(
            {"user_id": uid},
            {"user_id": 0},
        )
        .sort("created_at", -1)
        .limit(50)
    )

    result = []
    for tx in raw:
        result.append({
            "id":            str(tx["_id"]),
            "type":          tx.get("type", ""),
            "note":          tx.get("note", ""),
            "amount":        tx.get("amount"),
            "balance_after": tx.get("balance_after"),
            "ref_type":      tx.get("ref_type", ""),
            "ref_id":        str(tx["ref_id"]) if tx.get("ref_id") else None,
            "created_at":    tx["created_at"].isoformat() if tx.get("created_at") else None,
        })

    return jsonify(result)


# ---------------------------------------------------------------------------
# Exchange routes
# ---------------------------------------------------------------------------

@app.route("/api/exchange/eligible", methods=["GET"])
@require_auth
def exchange_eligible():
    offered_id_str = request.args.get("offered_card_id", "").strip()
    try:
        offered_oid = ObjectId(offered_id_str)
    except Exception:
        return jsonify({"error": "Invalid card ID"}), 400

    offered_card = mongo.db.cards.find_one({"_id": offered_oid})
    if not offered_card:
        return jsonify({"error": "Card not found"}), 404

    offered_value = float(offered_card["value"])

    avail_entries = list(mongo.db.company_inventory.find({
        "$or": [
            {"available_quantity": {"$gt": 0}},
            {"fulfillable": True},
        ]
    }))

    eligible_card_ids = [
        e["card_id"] for e in avail_entries if e["card_id"] != offered_oid
    ]

    if not eligible_card_ids:
        return jsonify([])

    eligible_cards = list(mongo.db.cards.find({
        "_id":   {"$in": eligible_card_ids},
        "value": {"$lte": offered_value},
    }))

    eligible_cards.sort(key=lambda c: float(c["value"]), reverse=True)

    return jsonify([
        {
            "card_id":   str(c["_id"]),
            "name":      c["name"],
            "image_url": c["image_url"],
            "rarity":    c["rarity"],
            "value":     c["value"],
        }
        for c in eligible_cards
    ])


@app.route("/api/exchange/confirm", methods=["POST"])
@require_auth
def exchange_confirm():
    data               = request.get_json(silent=True) or {}
    offered_id_str     = data.get("offered_card_id", "")
    replacement_id_str = data.get("replacement_card_id", "")

    try:
        offered_oid     = ObjectId(offered_id_str)
        replacement_oid = ObjectId(replacement_id_str)
    except Exception:
        return jsonify({"error": "Invalid card ID"}), 400

    if offered_oid == replacement_oid:
        return jsonify({"error": "Cannot exchange a card for itself"}), 400

    uid = ObjectId(g.user_id)

    offered_card = mongo.db.cards.find_one({"_id": offered_oid})
    if not offered_card:
        return jsonify({"error": "Offered card not found"}), 404

    replacement_card = mongo.db.cards.find_one({"_id": replacement_oid})
    if not replacement_card:
        return jsonify({"error": "Replacement card not found"}), 404

    if float(replacement_card["value"]) > float(offered_card["value"]):
        return jsonify({"error": "Replacement card value exceeds offered card value"}), 400

    # Quick pre-checks (enforced atomically again inside the transaction)
    user_inv = mongo.db.inventory.find_one(
        {"user_id": uid, "card_id": offered_oid, "quantity": {"$gte": 1}}
    )
    if not user_inv:
        return jsonify({"error": "You do not own this card"}), 400
    if user_inv.get("withdrawal_pending"):
        return jsonify({"error": "This card has a pending shipment request and cannot be traded."}), 400

    company_rec = mongo.db.company_inventory.find_one({"card_id": replacement_oid})
    if not company_rec:
        return jsonify({"error": "This card is not available for exchange"}), 400
    if company_rec.get("available_quantity", 0) <= 0 and not company_rec.get("fulfillable", False):
        return jsonify({"error": "This card is no longer in stock"}), 400

    now = datetime.now(timezone.utc)

    no_card                 = False
    card_unavailable        = False
    company_qty_decremented = False
    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                # 1. Remove one copy of offered card from user inventory
                offered_inv = mongo.db.inventory.find_one_and_update(
                    {"user_id": uid, "card_id": offered_oid, "quantity": {"$gte": 1}},
                    {"$inc": {"quantity": -1}},
                    return_document=True,
                    session=session,
                )
                if offered_inv is None:
                    no_card = True
                    raise RuntimeError("no_card")

                # 2. Clean up zero-quantity row
                if offered_inv["quantity"] == 0:
                    mongo.db.inventory.delete_one(
                        {"_id": offered_inv["_id"]},
                        session=session,
                    )

                # 3. Decrement company inventory for replacement if stock available
                qty_update = mongo.db.company_inventory.find_one_and_update(
                    {"card_id": replacement_oid, "available_quantity": {"$gt": 0}},
                    {"$inc": {"available_quantity": -1}, "$set": {"updated_at": now}},
                    return_document=True,
                    session=session,
                )
                if qty_update is not None:
                    company_qty_decremented = True
                else:
                    # Fall back to fulfillable (no quantity to decrement)
                    fulfillable_rec = mongo.db.company_inventory.find_one(
                        {"card_id": replacement_oid, "fulfillable": True},
                        session=session,
                    )
                    if fulfillable_rec is None:
                        card_unavailable = True
                        raise RuntimeError("card_unavailable")

                # 4. Add replacement card to user inventory
                mongo.db.inventory.update_one(
                    {"user_id": uid, "card_id": replacement_oid},
                    {
                        "$inc":         {"quantity": 1},
                        "$setOnInsert": {"acquired_at": now},
                    },
                    upsert=True,
                    session=session,
                )

                # 5. Increment company inventory for the offered card (we now own it)
                mongo.db.company_inventory.update_one(
                    {"card_id": offered_oid},
                    {
                        "$inc":         {"available_quantity": 1},
                        "$set":         {"updated_at": now},
                        "$setOnInsert": {"fulfillable": False},
                    },
                    upsert=True,
                    session=session,
                )

                # 6. Exchange log inside the transaction — receipt and inventory swap are atomic
                mongo.db.exchange_log.insert_one({
                    "user_id":              uid,
                    "offered_card_id":      offered_oid,
                    "offered_card_name":    offered_card["name"],
                    "offered_value":        float(offered_card["value"]),
                    "received_card_id":     replacement_oid,
                    "received_card_name":   replacement_card["name"],
                    "received_value":       float(replacement_card["value"]),
                    "status":               "completed",
                    "created_at":           now,
                }, session=session)

    except Exception:
        if no_card:
            return jsonify({"error": "You no longer own this card"}), 400
        if card_unavailable:
            return jsonify({"error": "This card is no longer available for exchange"}), 400
        return jsonify({"error": "Exchange failed. Please try again."}), 500

    return jsonify({
        "ok":             True,
        "offered_card":   {"id": str(offered_oid),     "name": offered_card["name"]},
        "replacement_card": {"id": str(replacement_oid), "name": replacement_card["name"]},
    })


# ---------------------------------------------------------------------------
# Upgrade routes
# ---------------------------------------------------------------------------

@app.route("/api/upgrade/targets", methods=["GET"])
@require_auth
def upgrade_targets():
    """Return company_inventory cards the user can try to upgrade into."""
    input_id_str = request.args.get("input_card_id", "").strip()
    try:
        input_oid = ObjectId(input_id_str)
    except Exception:
        return jsonify({"error": "Invalid card ID"}), 400

    input_card = mongo.db.cards.find_one({"_id": input_oid})
    if not input_card:
        return jsonify({"error": "Card not found"}), 404

    uid = ObjectId(g.user_id)
    owns = mongo.db.inventory.find_one(
        {"user_id": uid, "card_id": input_oid, "quantity": {"$gte": 1}}
    )
    if not owns:
        return jsonify({"error": "You do not own this card"}), 400

    input_value = float(input_card["value"])

    avail_entries = list(mongo.db.company_inventory.find({
        "$or": [
            {"available_quantity": {"$gt": 0}},
            {"fulfillable": True},
        ]
    }))

    target_ids = [e["card_id"] for e in avail_entries if e["card_id"] != input_oid]
    if not target_ids:
        return jsonify([])

    target_cards = list(mongo.db.cards.find({
        "_id":   {"$in": target_ids},
        "value": {"$gt": input_value},
    }))

    target_cards.sort(key=lambda c: float(c["value"]))

    return jsonify([
        {
            "card_id":        str(c["_id"]),
            "name":           c["name"],
            "image_url":      c.get("image_url", ""),
            "rarity":         c["rarity"],
            "value":          float(c["value"]),
            "success_chance": round(input_value / float(c["value"]), 4),
        }
        for c in target_cards
    ])


@app.route("/api/upgrade/init", methods=["POST"])
@require_auth
def upgrade_init():
    data           = request.get_json(silent=True) or {}
    input_id_str   = data.get("input_card_id", "")
    target_id_str  = data.get("target_card_id", "")
    client_seed_in = str(data.get("client_seed", "")).strip()[:128]

    try:
        input_oid  = ObjectId(input_id_str)
        target_oid = ObjectId(target_id_str)
    except Exception:
        return jsonify({"error": "Invalid card ID"}), 400

    if input_oid == target_oid:
        return jsonify({"error": "Input and target card cannot be the same"}), 400

    uid = ObjectId(g.user_id)

    input_card = mongo.db.cards.find_one({"_id": input_oid})
    if not input_card:
        return jsonify({"error": "Input card not found"}), 404

    target_card = mongo.db.cards.find_one({"_id": target_oid})
    if not target_card:
        return jsonify({"error": "Target card not found"}), 404

    input_value  = float(input_card["value"])
    target_value = float(target_card["value"])

    if target_value <= input_value:
        return jsonify({"error": "Target card must be higher value than input card"}), 400

    owns = mongo.db.inventory.find_one(
        {"user_id": uid, "card_id": input_oid, "quantity": {"$gte": 1}}
    )
    if not owns:
        return jsonify({"error": "You do not own this card"}), 400
    if owns.get("withdrawal_pending"):
        return jsonify({"error": "This card has a pending shipment request and cannot be upgraded."}), 400

    company_rec = mongo.db.company_inventory.find_one({"card_id": target_oid})
    if not company_rec:
        return jsonify({"error": "Target card is not available for upgrade"}), 400
    if company_rec.get("available_quantity", 0) <= 0 and not company_rec.get("fulfillable", False):
        return jsonify({"error": "Target card is no longer in stock"}), 400

    # Generate commit seeds
    server_seed      = secrets.token_hex(32)
    server_seed_hash = hashlib.sha256(server_seed.encode()).hexdigest()
    client_seed      = client_seed_in if client_seed_in else secrets.token_hex(16)
    nonce            = mongo.db.upgrade_log.count_documents({"user_id": uid})

    now        = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=30)

    result = mongo.db.upgrade_pending.insert_one({
        "user_id":          uid,
        "input_card_id":    input_oid,
        "target_card_id":   target_oid,
        "server_seed":      server_seed,
        "server_seed_hash": server_seed_hash,
        "client_seed":      client_seed,
        "nonce":            nonce,
        "status":           "pending",
        "created_at":       now,
        "expires_at":       expires_at,
    })

    return jsonify({
        "pending_id":       str(result.inserted_id),
        "server_seed_hash": server_seed_hash,
        "client_seed":      client_seed,
        "nonce":            nonce,
        "success_chance":   round(input_value / target_value, 4),
        "input_card_name":  input_card["name"],
        "target_card_name": target_card["name"],
        "input_value":      input_value,
        "target_value":     target_value,
        "expires_at":       expires_at.isoformat(),
    })


@app.route("/api/upgrade/confirm", methods=["POST"])
@require_auth
def upgrade_confirm():
    data           = request.get_json(silent=True) or {}
    pending_id_str = data.get("pending_id", "")

    win_start_angle_raw = data.get("win_start_angle", 0)
    try:
        win_start_angle = float(win_start_angle_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "win_start_angle must be a number"}), 400
    if not (0 <= win_start_angle < 360):
        return jsonify({"error": "win_start_angle must be >= 0 and < 360"}), 400

    try:
        pending_oid = ObjectId(pending_id_str)
    except Exception:
        return jsonify({"error": "Invalid pending ID"}), 400

    uid     = ObjectId(g.user_id)
    pending = mongo.db.upgrade_pending.find_one({"_id": pending_oid})
    if not pending:
        return jsonify({"error": "Upgrade session not found"}), 404
    if pending["user_id"] != uid:
        return jsonify({"error": "Unauthorized"}), 403
    if pending["status"] != "pending":
        return jsonify({"error": "Upgrade already completed or expired"}), 400

    now        = datetime.now(timezone.utc)
    expires_at = pending["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        mongo.db.upgrade_pending.update_one(
            {"_id": pending_oid}, {"$set": {"status": "expired"}}
        )
        return jsonify({"error": "Upgrade session has expired. Please start a new upgrade."}), 400

    server_seed      = pending["server_seed"]
    server_seed_hash = pending["server_seed_hash"]
    client_seed      = pending["client_seed"]
    nonce            = pending["nonce"]
    input_oid        = pending["input_card_id"]
    target_oid       = pending["target_card_id"]

    # Re-validate all conditions at confirm time
    if input_oid == target_oid:
        return jsonify({"error": "Input and target card cannot be the same"}), 400

    input_card = mongo.db.cards.find_one({"_id": input_oid})
    if not input_card:
        return jsonify({"error": "Input card not found"}), 404

    target_card = mongo.db.cards.find_one({"_id": target_oid})
    if not target_card:
        return jsonify({"error": "Target card not found"}), 404

    input_value  = float(input_card["value"])
    target_value = float(target_card["value"])

    if target_value <= input_value:
        return jsonify({"error": "Target card must be higher value than input card"}), 400

    owns = mongo.db.inventory.find_one(
        {"user_id": uid, "card_id": input_oid, "quantity": {"$gte": 1}}
    )
    if not owns:
        return jsonify({"error": "You do not own this card"}), 400

    company_rec = mongo.db.company_inventory.find_one({"card_id": target_oid})
    if not company_rec:
        return jsonify({"error": "Target card is not available for upgrade"}), 400
    if company_rec.get("available_quantity", 0) <= 0 and not company_rec.get("fulfillable", False):
        return jsonify({"error": "Target card is no longer in stock"}), 400

    # Commit-reveal roll — frontend never controls odds
    digest         = hashlib.sha256(f"{server_seed}:{client_seed}:{nonce}".encode()).hexdigest()
    roll           = int(digest[:8], 16) / 0x100000000
    success_chance = input_value / target_value
    win_arc_degrees = success_chance * 360
    roll_angle      = roll * 360
    win_end_angle   = (win_start_angle + win_arc_degrees) % 360
    if win_arc_degrees >= 360:
        succeeded = True
    elif win_start_angle < win_end_angle:
        succeeded = win_start_angle <= roll_angle < win_end_angle
    else:
        succeeded = roll_angle >= win_start_angle or roll_angle < win_end_angle

    no_card        = False
    target_unavail = False

    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                # 1. Remove one copy of input card from user inventory
                input_inv = mongo.db.inventory.find_one_and_update(
                    {"user_id": uid, "card_id": input_oid, "quantity": {"$gte": 1}},
                    {"$inc": {"quantity": -1}},
                    return_document=True,
                    session=session,
                )
                if input_inv is None:
                    no_card = True
                    raise RuntimeError("no_card")

                # 2. Clean up zero-quantity row
                if input_inv["quantity"] == 0:
                    mongo.db.inventory.delete_one(
                        {"_id": input_inv["_id"]}, session=session
                    )

                if succeeded:
                    # 3a. Decrement company_inventory for target
                    qty_update = mongo.db.company_inventory.find_one_and_update(
                        {"card_id": target_oid, "available_quantity": {"$gt": 0}},
                        {"$inc": {"available_quantity": -1}, "$set": {"updated_at": now}},
                        return_document=True,
                        session=session,
                    )
                    if qty_update is None:
                        fulfillable_rec = mongo.db.company_inventory.find_one(
                            {"card_id": target_oid, "fulfillable": True},
                            session=session,
                        )
                        if fulfillable_rec is None:
                            target_unavail = True
                            raise RuntimeError("target_unavail")

                    # 3b. Add target card to user inventory
                    mongo.db.inventory.update_one(
                        {"user_id": uid, "card_id": target_oid},
                        {
                            "$inc":         {"quantity": 1},
                            "$setOnInsert": {"acquired_at": now},
                        },
                        upsert=True,
                        session=session,
                    )

                # 4. Return input card to company inventory
                mongo.db.company_inventory.update_one(
                    {"card_id": input_oid},
                    {
                        "$inc":         {"available_quantity": 1},
                        "$set":         {"updated_at": now},
                        "$setOnInsert": {"fulfillable": False},
                    },
                    upsert=True,
                    session=session,
                )

                # 5. Upgrade log with provably fair fields — atomic with inventory
                mongo.db.upgrade_log.insert_one({
                    "user_id":           uid,
                    "input_card_id":     input_oid,
                    "input_card_name":   input_card["name"],
                    "input_value":       input_value,
                    "target_card_id":    target_oid,
                    "target_card_name":  target_card["name"],
                    "target_value":      target_value,
                    "success_chance":    round(success_chance, 4),
                    "result":            "success" if succeeded else "fail",
                    "status":            "completed",
                    "server_seed":       server_seed,
                    "server_seed_hash":  server_seed_hash,
                    "client_seed":       client_seed,
                    "nonce":             nonce,
                    "roll":              round(roll, 8),
                    "win_start_angle":   win_start_angle,
                    "win_arc_degrees":   round(win_arc_degrees, 6),
                    "roll_angle":        round(roll_angle, 6),
                    "created_at":        now,
                }, session=session)

                # 6. Delete the pending record
                mongo.db.upgrade_pending.delete_one({"_id": pending_oid}, session=session)

    except Exception:
        if no_card:
            return jsonify({"error": "You no longer own this card"}), 400
        if target_unavail:
            return jsonify({"error": "Target card is no longer available"}), 400
        return jsonify({"error": "Upgrade failed. Please try again."}), 500

    return jsonify({
        "ok":               True,
        "result":           "success" if succeeded else "fail",
        "input_card_name":  input_card["name"],
        "target_card_name": target_card["name"],
        "success_chance":   round(success_chance, 4),
        "roll":             round(roll, 8),
        "server_seed":      server_seed,
        "server_seed_hash": server_seed_hash,
        "client_seed":      client_seed,
        "nonce":            nonce,
        "win_start_angle":  win_start_angle,
        "win_arc_degrees":  round(win_arc_degrees, 6),
        "roll_angle":       round(roll_angle, 6),
    })


@app.route("/api/admin/upgrade-logs", methods=["GET"])
@require_admin
def admin_upgrade_logs():
    limit = min(int(request.args.get("limit", 50)), 200)
    raw   = list(mongo.db.upgrade_log.find({}).sort("created_at", -1).limit(limit))
    result = []
    for r in raw:
        result.append({
            "id":               str(r["_id"]),
            "user_id":          str(r["user_id"]),
            "input_card_name":  r.get("input_card_name"),
            "input_value":      r.get("input_value"),
            "target_card_name": r.get("target_card_name"),
            "target_value":     r.get("target_value"),
            "success_chance":   r.get("success_chance"),
            "result":           r.get("result"),
            "status":           r.get("status"),
            "server_seed":      r.get("server_seed"),
            "server_seed_hash": r.get("server_seed_hash"),
            "client_seed":      r.get("client_seed"),
            "nonce":            r.get("nonce"),
            "roll":             r.get("roll"),
            "win_start_angle":  r.get("win_start_angle"),
            "win_arc_degrees":  r.get("win_arc_degrees"),
            "roll_angle":       r.get("roll_angle"),
            "created_at":       r["created_at"].isoformat() if r.get("created_at") else None,
        })
    return jsonify(result)


@app.route("/api/admin/exchange-logs", methods=["GET"])
@require_admin
def admin_exchange_logs():
    limit = min(int(request.args.get("limit", 50)), 200)
    raw   = list(mongo.db.exchange_log.find({}).sort("created_at", -1).limit(limit))
    result = []
    for r in raw:
        result.append({
            "id":                str(r["_id"]),
            "user_id":           str(r["user_id"]),
            "offered_card_id":   str(r.get("offered_card_id", "")),
            "offered_card_name": r.get("offered_card_name"),
            "offered_value":     r.get("offered_value", r.get("offered_card_value")),
            "received_card_id":  str(r.get("received_card_id") or r.get("replacement_card_id", "")),
            "received_card_name":r.get("received_card_name", r.get("replacement_card_name")),
            "received_value":    r.get("received_value", r.get("replacement_card_value")),
            "status":            r.get("status", "completed"),
            "created_at":        r["created_at"].isoformat() if r.get("created_at") else None,
        })
    return jsonify(result)


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@app.route("/api/admin/ping", methods=["GET"])
@require_admin
def admin_ping():
    return jsonify({"ok": True, "message": "admin access confirmed"})


@app.route("/api/admin/users", methods=["GET"])
@require_admin
def admin_users():
    raw = list(
        mongo.db.users.find({}, {"password_hash": 0})
        .sort("created_at", -1)
        .limit(50)
    )
    result = []
    for u in raw:
        result.append({
            "id":         str(u["_id"]),
            "name":       u.get("name", ""),
            "email":      u.get("email", ""),
            "credits":    u.get("credits", 0),
            "wins":       u.get("wins", 0),
            "losses":     u.get("losses", 0),
            "is_admin":   u.get("is_admin", False) is True,
            "created_at": u["created_at"].isoformat() if u.get("created_at") else None,
        })
    return jsonify(result)


@app.route("/api/admin/battles", methods=["GET"])
@require_admin
def admin_battles():
    status_filter = request.args.get("status", "").strip()
    type_filter   = request.args.get("type",   "").strip()

    query = {}
    if status_filter in ("open", "completed", "cancelled"):
        query["status"] = status_filter
    if type_filter == "bot":
        query["is_bot_battle"] = True
    elif type_filter == "human":
        query["is_bot_battle"] = {"$ne": True}

    raw = list(
        mongo.db.battles.find(query)
        .sort("created_at", -1)
        .limit(50)
    )

    # Batch-fetch packs and users to avoid N+1 queries
    pack_ids     = list({b["pack_id"]    for b in raw if b.get("pack_id")})
    creator_ids  = list({b["creator_id"] for b in raw if b.get("creator_id")})
    winner_ids   = list({b["winner_id"]  for b in raw if b.get("winner_id")})
    all_user_ids = list(set(creator_ids) | set(winner_ids))

    packs_map = {
        str(p["_id"]): p.get("name", "Unknown Pack")
        for p in mongo.db.packs.find({"_id": {"$in": pack_ids}}, {"name": 1})
    }
    users_map = {
        str(u["_id"]): u.get("name", "Unknown")
        for u in mongo.db.users.find({"_id": {"$in": all_user_ids}}, {"name": 1})
    }

    result = []
    for b in raw:
        pack_id    = b.get("pack_id")
        creator_id = b.get("creator_id")
        winner_id  = b.get("winner_id")
        status     = b.get("status", "unknown")
        is_bot     = b.get("is_bot_battle", False)

        pack_name    = packs_map.get(str(pack_id), "Unknown Pack") if pack_id else "Unknown Pack"
        creator_name = users_map.get(str(creator_id), "Unknown")   if creator_id else "Unknown"

        if winner_id:
            winner_name = users_map.get(str(winner_id), "Unknown")
        elif status == "completed" and is_bot:
            winner_name = "Bot"
        else:
            winner_name = None

        result.append({
            "id":            str(b["_id"]),
            "status":        status,
            "pack_name":     pack_name,
            "pack_quantity": b.get("pack_quantity", 1),
            "creator_name":  creator_name,
            "winner_name":   winner_name,
            "is_bot_battle": is_bot,
            "created_at":    b["created_at"].isoformat()    if b.get("created_at")    else None,
            "completed_at":  b["completed_at"].isoformat()  if b.get("completed_at")  else None,
            "cancelled_at":  b["cancelled_at"].isoformat()  if b.get("cancelled_at")  else None,
        })

    return jsonify(result)


@app.route("/api/admin/transactions", methods=["GET"])
@require_admin
def admin_transactions():
    type_filter = request.args.get("type", "").strip()

    valid_types = {
        "pack_open_spend", "battle_create_spend",
        "battle_join_spend", "battle_cancel_refund",
        "admin_credit_adjustment",
    }
    query = {}
    if type_filter in valid_types:
        query["type"] = type_filter

    raw = list(
        mongo.db.credit_transactions.find(query)
        .sort("created_at", -1)
        .limit(50)
    )

    # Batch-fetch all needed user names in one query:
    # target user_ids + admin_ids from adjustment records.
    all_ids = set()
    for tx in raw:
        if tx.get("user_id"):  all_ids.add(tx["user_id"])
        if tx.get("admin_id"): all_ids.add(tx["admin_id"])
    users_map = {
        str(u["_id"]): u.get("name", "Unknown")
        for u in mongo.db.users.find({"_id": {"$in": list(all_ids)}}, {"name": 1})
    }

    result = []
    for tx in raw:
        uid      = tx.get("user_id")
        admin_id = tx.get("admin_id")
        result.append({
            "id":            str(tx["_id"]),
            "user_name":     users_map.get(str(uid), "Unknown") if uid else "Unknown",
            "admin_name":    users_map.get(str(admin_id)) if admin_id else None,
            "type":          tx.get("type", ""),
            "note":          tx.get("note", ""),
            "amount":        tx.get("amount"),
            "balance_after": tx.get("balance_after"),
            "ref_type":      tx.get("ref_type", ""),
            "ref_id":        str(tx["ref_id"]) if tx.get("ref_id") else None,
            "created_at":    tx["created_at"].isoformat() if tx.get("created_at") else None,
        })

    return jsonify(result)


@app.route("/api/admin/users/<user_id>", methods=["GET"])
@require_admin
def admin_user_detail(user_id):
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 404

    user = mongo.db.users.find_one({"_id": uid}, {"password_hash": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # --- Battles (last 20, target user's perspective) ---
    raw_battles = list(
        mongo.db.battles.find(
            {
                "status": {"$in": ["completed", "cancelled"]},
                "$or": [{"creator_id": uid}, {"opponent_id": uid}],
            }
        )
        .sort("created_at", -1)
        .limit(20)
    )

    # Batch-fetch packs
    pack_ids  = list({b.get("pack_id") for b in raw_battles if b.get("pack_id")})
    packs_map = {
        str(p["_id"]): p.get("name", "Unknown Pack")
        for p in mongo.db.packs.find({"_id": {"$in": pack_ids}}, {"name": 1})
    }

    # Batch-fetch opponent user names
    other_ids = set()
    for b in raw_battles:
        if b.get("creator_id"):  other_ids.add(b["creator_id"])
        if b.get("opponent_id"): other_ids.add(b["opponent_id"])
    other_ids.discard(uid)
    others_map = {
        str(u["_id"]): u.get("name", "Unknown")
        for u in mongo.db.users.find({"_id": {"$in": list(other_ids)}}, {"name": 1})
    }

    battles = []
    for b in raw_battles:
        pack_id    = b.get("pack_id")
        pack_name  = packs_map.get(str(pack_id), "Unknown Pack") if pack_id else "Unknown Pack"
        qty        = b.get("pack_quantity", 1)
        status     = b.get("status", "unknown")
        creator_id = b.get("creator_id")
        is_creator = (creator_id == uid) if creator_id else False
        is_bot     = b.get("is_bot_battle", False)

        if status == "cancelled":
            result_label  = "cancelled"
            opponent_name = None
            my_total      = None
            their_total   = None
        else:
            if is_bot:
                opponent_name = b.get("bot_name", "Bot")
            elif is_creator:
                opp_id        = b.get("opponent_id")
                opponent_name = others_map.get(str(opp_id), "Unknown") if opp_id else "Unknown"
            else:
                opponent_name = others_map.get(str(creator_id), "Unknown") if creator_id else "Unknown"

            winner_id    = b.get("winner_id")
            result_label = "win" if (winner_id and winner_id == uid) else "loss"

            if is_creator:
                my_total    = b.get("creator_total")
                their_total = b.get("opponent_total")
            else:
                my_total    = b.get("opponent_total")
                their_total = b.get("creator_total")

        battles.append({
            "id":            str(b["_id"]),
            "status":        status,
            "pack_name":     pack_name,
            "pack_quantity": qty,
            "opponent_name": opponent_name,
            "result":        result_label,
            "my_total":      my_total,
            "their_total":   their_total,
            "is_bot_battle": is_bot,
            "completed_at":  b["completed_at"].isoformat() if b.get("completed_at") else None,
            "cancelled_at":  b["cancelled_at"].isoformat() if b.get("cancelled_at") else None,
        })

    # --- Transactions (last 30) ---
    raw_tx = list(
        mongo.db.credit_transactions.find(
            {"user_id": uid},
            {"user_id": 0},
        )
        .sort("created_at", -1)
        .limit(30)
    )

    transactions = []
    for tx in raw_tx:
        transactions.append({
            "id":            str(tx["_id"]),
            "type":          tx.get("type", ""),
            "note":          tx.get("note", ""),
            "amount":        tx.get("amount"),
            "balance_after": tx.get("balance_after"),
            "ref_type":      tx.get("ref_type", ""),
            "ref_id":        str(tx["ref_id"]) if tx.get("ref_id") else None,
            "created_at":    tx["created_at"].isoformat() if tx.get("created_at") else None,
        })

    return jsonify({
        "user": {
            "id":         str(user["_id"]),
            "name":       user.get("name", ""),
            "email":      user.get("email", ""),
            "credits":    user.get("credits", 0),
            "wins":       user.get("wins", 0),
            "losses":     user.get("losses", 0),
            "is_admin":   user.get("is_admin", False) is True,
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
        },
        "battles":      battles,
        "transactions": transactions,
    })


@app.route("/api/admin/users/<user_id>/adjust_credits", methods=["POST"])
@require_admin
def admin_adjust_credits(user_id):
    # --- Input validation ---
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 404

    admin_oid = ObjectId(g.user_id)
    body      = request.get_json(silent=True) or {}

    try:
        amount = int(body.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "amount must be an integer"}), 400

    if amount == 0:
        return jsonify({"error": "amount must not be 0"}), 400

    reason = str(body.get("reason", "")).strip()
    if not reason:
        return jsonify({"error": "reason is required"}), 400

    # Pre-flight: confirm user exists and has enough credits for deductions
    user = mongo.db.users.find_one({"_id": uid}, {"credits": 1, "name": 1})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("credits", 0) + amount < 0:
        return jsonify({
            "error": f"Insufficient credits. Current balance: {user.get('credits', 0)}"
        }), 400

    # --- Atomic credit update + ledger insert ---
    # Requires a MongoDB replica set (Atlas M2+ or self-hosted replica set).
    # If the transaction fails for any reason, both operations are rolled back.
    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                updated = mongo.db.users.find_one_and_update(
                    {"_id": uid},
                    {"$inc": {"credits": amount}},
                    return_document=True,
                    session=session,
                )
                if updated is None:
                    raise RuntimeError("user_not_found")

                new_balance = updated["credits"]

                mongo.db.credit_transactions.insert_one(
                    {
                        "user_id":       uid,
                        "type":          "admin_credit_adjustment",
                        "amount":        amount,
                        "balance_after": new_balance,
                        "note":          reason,
                        "ref_type":      "admin",
                        "ref_id":        admin_oid,
                        "admin_id":      admin_oid,
                        "created_at":    datetime.now(timezone.utc),
                    },
                    session=session,
                )
    except RuntimeError as exc:
        if str(exc) == "user_not_found":
            return jsonify({"error": "User not found"}), 404
        return jsonify({"error": "Adjustment failed. No changes were made."}), 500
    except Exception:
        return jsonify({"error": "Adjustment failed. No changes were made."}), 500

    return jsonify({
        "ok":          True,
        "new_balance": new_balance,
        "user_name":   updated.get("name", ""),
    })


# ---------------------------------------------------------------------------
# Admin — company inventory management
# ---------------------------------------------------------------------------

@app.route("/api/admin/company-inventory", methods=["GET"])
@require_admin
def admin_company_inventory_list():
    entries = list(mongo.db.company_inventory.find({}))

    card_ids  = [e["card_id"] for e in entries]
    cards_map = {
        str(c["_id"]): c
        for c in mongo.db.cards.find({"_id": {"$in": card_ids}})
    }

    RARITY_ORDER = {"ultra_rare": 0, "rare": 1, "uncommon": 2, "common": 3}

    result = []
    for e in entries:
        card = cards_map.get(str(e["card_id"]))
        result.append({
            "card_id":            str(e["card_id"]),
            "card_name":          card["name"]      if card else "Unknown",
            "card_image_url":     card["image_url"] if card else "",
            "card_rarity":        card["rarity"]    if card else "",
            "card_value":         card["value"]     if card else 0,
            "available_quantity": e.get("available_quantity", 0),
            "fulfillable":        e.get("fulfillable", False),
            "updated_at":         e["updated_at"].isoformat() if e.get("updated_at") else None,
        })

    result.sort(key=lambda x: (RARITY_ORDER.get(x["card_rarity"], 99), x["card_name"]))
    return jsonify(result)


@app.route("/api/admin/company-inventory", methods=["POST"])
@require_admin
def admin_company_inventory_upsert():
    data        = request.get_json(silent=True) or {}
    card_id_str = data.get("card_id", "")

    try:
        card_oid = ObjectId(card_id_str)
    except Exception:
        return jsonify({"error": "Invalid card_id"}), 400

    card = mongo.db.cards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "Card not found"}), 404

    available_quantity = data.get("available_quantity")
    fulfillable        = data.get("fulfillable")

    if available_quantity is None and fulfillable is None:
        return jsonify({"error": "Provide available_quantity and/or fulfillable"}), 400

    now        = datetime.now(timezone.utc)
    set_fields = {"updated_at": now}

    if available_quantity is not None:
        try:
            available_quantity = int(available_quantity)
        except (TypeError, ValueError):
            return jsonify({"error": "available_quantity must be an integer"}), 400
        if available_quantity < 0:
            return jsonify({"error": "available_quantity cannot be negative"}), 400
        set_fields["available_quantity"] = available_quantity

    if fulfillable is not None:
        set_fields["fulfillable"] = bool(fulfillable)

    # $setOnInsert provides defaults for fields not in $set, applied only on first insert
    setOnInsert_fields = {}
    if "available_quantity" not in set_fields:
        setOnInsert_fields["available_quantity"] = 0
    if "fulfillable" not in set_fields:
        setOnInsert_fields["fulfillable"] = False

    update_doc = {"$set": set_fields}
    if setOnInsert_fields:
        update_doc["$setOnInsert"] = setOnInsert_fields

    mongo.db.company_inventory.update_one(
        {"card_id": card_oid},
        update_doc,
        upsert=True,
    )

    return jsonify({"ok": True, "card_id": str(card_oid), "card_name": card["name"]})


@app.route("/api/admin/cards-with-inventory", methods=["GET"])
@require_admin
def admin_cards_with_inventory():
    """All master cards left-joined with company_inventory — every card appears."""
    all_cards = list(mongo.db.cards.find({}))

    inv_entries = list(mongo.db.company_inventory.find({}))
    inv_map = {str(e["card_id"]): e for e in inv_entries}

    RARITY_ORDER = {"ultra_rare": 0, "rare": 1, "uncommon": 2, "common": 3}

    result = []
    for card in all_cards:
        cid = str(card["_id"])
        inv = inv_map.get(cid, {})
        qty         = inv.get("available_quantity", 0)
        fulfillable = inv.get("fulfillable", False)
        lpu = card.get("last_price_update")
        result.append({
            "card_id":               cid,
            "card_name":             card.get("name", ""),
            "card_rarity":           card.get("rarity", ""),
            "card_value":            float(card.get("value", 0)),
            "card_image_url":        card.get("image_url", ""),
            "available_quantity":    qty,
            "fulfillable":           fulfillable,
            "in_inventory":          cid in inv_map,
            "trade_eligible":        qty > 0 or fulfillable,
            "updated_at":            inv["updated_at"].isoformat() if inv.get("updated_at") else None,
            # Pricing / provider fields for Marketplace Quick Check (admin-only)
            "set_name":              card.get("set_name"),
            "set_code":              card.get("set_code"),
            "provider_card_id":      card.get("provider_card_id"),
            "tcgplayer_price_usd":   card.get("tcgplayer_price_usd"),
            "cardmarket_price_eur":  card.get("cardmarket_price_eur"),
            "market_price":          card.get("market_price"),
            "market_price_currency": card.get("market_price_currency"),
            "last_price_update":     lpu.isoformat() if lpu else None,
        })

    result.sort(key=lambda x: (RARITY_ORDER.get(x["card_rarity"], 99), x["card_name"]))
    return jsonify(result)


# ---------------------------------------------------------------------------
# Admin — card price override
# ---------------------------------------------------------------------------

@app.route("/api/admin/cards/<card_id>/price", methods=["PATCH"])
@require_admin
def admin_card_price_override(card_id):
    """
    Set or update admin_price_override (and optional note) on a card.
    Does NOT touch the gameplay `value` field — Phase 1 only.
    """
    data = request.get_json(silent=True) or {}

    try:
        card_oid = ObjectId(card_id)
    except Exception:
        return jsonify({"error": "Invalid card_id"}), 400

    card = mongo.db.cards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "Card not found"}), 404

    override = data.get("admin_price_override")
    note     = data.get("admin_override_note")

    if override is None and note is None:
        return jsonify({"error": "Provide admin_price_override and/or admin_override_note"}), 400

    now        = datetime.now(timezone.utc)
    set_fields = {"updated_at": now}

    if override is not None:
        try:
            override = float(override)
        except (TypeError, ValueError):
            return jsonify({"error": "admin_price_override must be a number"}), 400
        if override < 0:
            return jsonify({"error": "admin_price_override must be >= 0"}), 400
        set_fields["admin_price_override"] = override
        set_fields["admin_override_at"]    = now

    if note is not None:
        set_fields["admin_override_note"] = str(note)

    mongo.db.cards.update_one({"_id": card_oid}, {"$set": set_fields})

    return jsonify({
        "ok":                   True,
        "card_id":              str(card_oid),
        "card_name":            card.get("name"),
        "admin_price_override": set_fields.get("admin_price_override"),
        "admin_override_note":  set_fields.get("admin_override_note"),
    })


# ---------------------------------------------------------------------------
# Admin — update card gameplay value
# ---------------------------------------------------------------------------

@app.route("/api/admin/cards/<card_id>/value", methods=["PATCH"])
@require_admin
def admin_card_update_value(card_id):
    """Update only the gameplay value (card.value) for a card."""
    try:
        card_oid = ObjectId(card_id)
    except Exception:
        return jsonify({"error": "Invalid card_id"}), 400

    card = mongo.db.cards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "Card not found"}), 404

    data = request.get_json(silent=True) or {}

    if "value" not in data:
        return jsonify({"error": "value is required"}), 400

    try:
        new_value = float(data["value"])
    except (TypeError, ValueError):
        return jsonify({"error": "value must be a number"}), 400

    import math
    if not math.isfinite(new_value):
        return jsonify({"error": "value must be a finite number"}), 400
    if new_value < 0:
        return jsonify({"error": "value must be >= 0"}), 400

    now = datetime.now(timezone.utc)
    mongo.db.cards.update_one(
        {"_id": card_oid},
        {"$set": {"value": new_value, "updated_at": now}},
    )

    return jsonify({
        "ok":        True,
        "card_id":   str(card_oid),
        "card_name": card.get("name"),
        "new_value": new_value,
    })


# ---------------------------------------------------------------------------
# Admin — TCGdex search
# ---------------------------------------------------------------------------

@app.route("/api/admin/tcgdex/search", methods=["GET"])
@require_admin
def admin_tcgdex_search():
    """Search TCGdex by card name. Returns up to 20 preview objects."""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "q parameter is required"}), 400

    try:
        from providers.tcgdex import TcgDexProvider
        results = TcgDexProvider().search(q)
    except Exception as exc:
        return jsonify({"error": f"TCGdex unavailable: {exc}"}), 502

    out = []
    for r in results[:20]:
        out.append({
            "provider_card_id":      r.provider_card_id,
            "name":                  r.name,
            "image_url":             r.image_url,
            "set_name":              r.set_name,
            "set_code":              r.set_code,
            "rarity":                r.rarity,
            "tcgplayer_price_usd":   r.tcgplayer_price_usd,
            "cardmarket_price_eur":  r.cardmarket_price_eur,
            "market_price":          r.market_price,
            "market_price_currency": r.market_price_currency,
        })

    return jsonify(out)


# ---------------------------------------------------------------------------
# Admin — import card from TCGdex
# ---------------------------------------------------------------------------

_VALID_RARITIES = {"common", "uncommon", "rare", "ultra_rare"}


@app.route("/api/admin/cards/import", methods=["POST"])
@require_admin
def admin_import_card():
    """
    Import a card from TCGdex into the cards collection.

    The backend re-fetches all provider fields (image_url, prices, set data)
    directly from TCGdex using provider_card_id. Only admin-editable fields
    are accepted from the request body: value, rarity, name, admin_price_override,
    admin_override_note.

    value is required and sets the gameplay value. market_price fields are
    stored for reference only and do not affect gameplay.
    """
    data = request.get_json(silent=True) or {}

    # ── provider_card_id ─────────────────────────────────────────────────
    provider_card_id = (data.get("provider_card_id") or "").strip()
    if not provider_card_id:
        return jsonify({"error": "provider_card_id is required"}), 400

    # ── value (gameplay) — required, >= 0 ────────────────────────────────
    raw_value = data.get("value")
    if raw_value is None or raw_value == "":
        return jsonify({"error": "value is required"}), 400
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return jsonify({"error": "value must be a number"}), 400
    if value < 0:
        return jsonify({"error": "value must be >= 0"}), 400

    # ── rarity — required, must be our enum ──────────────────────────────
    rarity = (data.get("rarity") or "").strip()
    if rarity not in _VALID_RARITIES:
        return jsonify({
            "error": f"rarity must be one of: {', '.join(sorted(_VALID_RARITIES))}"
        }), 400

    # ── admin_price_override — optional, >= 0 ────────────────────────────
    raw_override = data.get("admin_price_override")
    admin_price_override = None
    if raw_override is not None and raw_override != "":
        try:
            admin_price_override = float(raw_override)
        except (TypeError, ValueError):
            return jsonify({"error": "admin_price_override must be a number"}), 400
        if admin_price_override < 0:
            return jsonify({"error": "admin_price_override must be >= 0"}), 400

    # ── duplicate check on provider + provider_card_id ───────────────────
    existing = mongo.db.cards.find_one({
        "provider": "tcgdex",
        "provider_card_id": provider_card_id,
    })
    if existing:
        return jsonify({
            "error": (
                f"Card '{provider_card_id}' is already in the catalog "
                f"(id: {str(existing['_id'])})"
            )
        }), 409

    # ── re-fetch from TCGdex — never trust frontend provider fields ───────
    try:
        from providers.tcgdex import TcgDexProvider
        card_result = TcgDexProvider().get_card(provider_card_id)
    except Exception as exc:
        return jsonify({"error": f"TCGdex unavailable: {exc}"}), 502

    if card_result is None:
        return jsonify({
            "error": f"Card '{provider_card_id}' not found on TCGdex"
        }), 404

    # ── build document ────────────────────────────────────────────────────
    now  = datetime.now(timezone.utc)
    name = (data.get("name") or "").strip() or card_result.name

    doc = {
        # Admin-set fields
        "name":                  name,
        "rarity":                rarity,
        "value":                 value,
        "game":                  "Pokemon",
        # Provider data (re-fetched from TCGdex)
        "image_url":             card_result.image_url,
        "provider":              "tcgdex",
        "provider_card_id":      card_result.provider_card_id,
        "set_name":              card_result.set_name,
        "set_code":              card_result.set_code,
        "set_series":            None,
        "set_release_date":      card_result.set_release_date,
        "tcgplayer_price_usd":   card_result.tcgplayer_price_usd,
        "cardmarket_price_eur":  card_result.cardmarket_price_eur,
        "market_price":          card_result.market_price,
        "market_price_currency": card_result.market_price_currency,
        "price_source":          "tcgdex",
        "last_price_update":     now,
        # Admin override (optional)
        "admin_price_override":  admin_price_override,
        "admin_override_note":   data.get("admin_override_note") or None,
        "admin_override_at":     now if admin_price_override is not None else None,
        # Defaults
        "active":                True,
        "updated_at":            now,
    }

    result    = mongo.db.cards.insert_one(doc)
    card_id   = str(result.inserted_id)

    return jsonify({"ok": True, "card_id": card_id, "name": name}), 201


# ---------------------------------------------------------------------------
# Activity feed
# ---------------------------------------------------------------------------

@app.route("/api/activity/feed", methods=["GET"])
@require_auth
def activity_feed():
    limit = min(int(request.args.get("limit", 30)), 100)

    events = []

    # Upgrades
    for r in mongo.db.upgrade_log.find({}).sort("created_at", -1).limit(limit):
        if not r.get("created_at"):
            continue
        events.append({
            "type":    "upgrade",
            "user_id": r.get("user_id"),
            "detail":  {
                "input":  r.get("input_card_name", "?"),
                "target": r.get("target_card_name", "?"),
                "result": r.get("result"),
            },
            "ts": r["created_at"],
        })

    # Trades
    for r in mongo.db.exchange_log.find({}).sort("created_at", -1).limit(limit):
        if not r.get("created_at"):
            continue
        events.append({
            "type":    "trade",
            "user_id": r.get("user_id"),
            "detail":  {
                "offered":  r.get("offered_card_name", "?"),
                "received": r.get("received_card_name") or r.get("replacement_card_name", "?"),
            },
            "ts": r["created_at"],
        })

    # Pack opens
    for r in mongo.db.credit_transactions.find({"type": "pack_open_spend"}).sort("created_at", -1).limit(limit):
        if not r.get("created_at"):
            continue
        note = r.get("note", "")
        pack_name = note[len("Opened "):].strip() if note.startswith("Opened ") else (note or "a pack")
        events.append({
            "type":    "pack",
            "user_id": r.get("user_id"),
            "detail":  {"pack": pack_name},
            "ts":      r["created_at"],
        })

    # Completed battles
    for r in mongo.db.battles.find(
        {"status": "completed", "completed_at": {"$exists": True}}
    ).sort("completed_at", -1).limit(limit):
        ts = r.get("completed_at")
        if not ts:
            continue
        events.append({
            "type":    "battle",
            "user_id": r.get("winner_id"),
            "detail":  {
                "creator_id":  r.get("creator_id"),
                "opponent_id": r.get("opponent_id"),
                "winner_id":   r.get("winner_id"),
                "is_bot":      r.get("is_bot_battle", False),
                "bot_name":    r.get("bot_name", "Bot") if r.get("is_bot_battle") else None,
            },
            "ts": ts,
        })

    events.sort(key=lambda e: e["ts"], reverse=True)
    events = events[:limit]

    # Batch user lookup — collect all referenced user ObjectIds
    uid_set = set()
    for e in events:
        uid = e.get("user_id")
        if uid:
            uid_set.add(uid if isinstance(uid, ObjectId) else ObjectId(str(uid)))
        if e["type"] == "battle":
            for fid in (e["detail"].get("creator_id"), e["detail"].get("opponent_id")):
                if fid:
                    uid_set.add(fid if isinstance(fid, ObjectId) else ObjectId(str(fid)))

    users_map = {}
    if uid_set:
        for u in mongo.db.users.find({"_id": {"$in": list(uid_set)}}, {"name": 1}):
            users_map[str(u["_id"])] = u.get("name", "Unknown")

    def _uname(oid):
        return users_map.get(str(oid), "Unknown") if oid else "Unknown"

    out = []
    for e in events:
        t  = e["type"]
        d  = e["detail"]
        ts = e["ts"].isoformat()

        if t == "upgrade":
            outcome = "upgraded" if d.get("result") == "win" else "failed to upgrade"
            out.append({"type": t, "user": _uname(e["user_id"]),
                        "text": f"{outcome} {d['input']} → {d['target']}",
                        "result": d.get("result"), "ts": ts})
        elif t == "trade":
            out.append({"type": t, "user": _uname(e["user_id"]),
                        "text": f"traded {d['offered']} for {d['received']}", "ts": ts})
        elif t == "pack":
            out.append({"type": t, "user": _uname(e["user_id"]),
                        "text": f"opened {d['pack']}", "ts": ts})
        elif t == "battle":
            wid = d.get("winner_id")
            cid = d.get("creator_id")
            oid_opp = d.get("opponent_id")
            winner_name = _uname(wid)
            if d.get("is_bot"):
                loser_name = d.get("bot_name", "Bot")
            else:
                loser_id = cid if (wid and str(wid) != str(cid)) else oid_opp
                loser_name = _uname(loser_id)
            out.append({"type": t, "user": winner_name,
                        "text": f"beat {loser_name} in a battle", "ts": ts})

    return jsonify(out)


# ---------------------------------------------------------------------------
# Ship Request routes
# ---------------------------------------------------------------------------

@app.route("/api/me/ship-requests", methods=["POST"])
@require_auth
def ship_request_submit():
    data             = request.get_json(silent=True) or {}
    card_id_str      = data.get("card_id", "")
    shipping_address = str(data.get("shipping_address", "")).strip()

    try:
        card_oid = ObjectId(card_id_str)
    except Exception:
        return jsonify({"error": "Invalid card_id"}), 400

    if not shipping_address:
        return jsonify({"error": "shipping_address is required"}), 400

    uid = ObjectId(g.user_id)

    # Pre-checks
    inv_row = mongo.db.inventory.find_one({"user_id": uid, "card_id": card_oid})
    if not inv_row or inv_row.get("quantity", 0) < 1:
        return jsonify({"error": "You do not own this card"}), 400
    if inv_row.get("withdrawal_pending"):
        return jsonify({"error": "A shipment request is already pending for this card"}), 400

    ci = mongo.db.company_inventory.find_one({"card_id": card_oid})
    if not ci:
        return jsonify({"error": "This card is not available for shipment"}), 400
    if not ci.get("fulfillable"):
        return jsonify({"error": "This card is not currently fulfillable"}), 400
    if ci.get("available_quantity", 0) <= 0:
        return jsonify({"error": "This card is out of stock"}), 400

    if mongo.db.ship_requests.find_one({"user_id": uid, "card_id": card_oid, "status": "pending"}):
        return jsonify({"error": "A shipment request is already pending for this card"}), 400

    card = mongo.db.cards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "Card not found"}), 404

    now     = datetime.now(timezone.utc)
    inv_oid = inv_row["_id"]
    inserted_id = None

    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                # 1. Decrement company available_quantity
                ci_result = mongo.db.company_inventory.update_one(
                    {"card_id": card_oid, "available_quantity": {"$gt": 0}},
                    {"$inc": {"available_quantity": -1}},
                    session=session,
                )
                if ci_result.matched_count == 0:
                    raise RuntimeError("out_of_stock")

                # 2. Set withdrawal_pending = true on user inventory
                inv_result = mongo.db.inventory.update_one(
                    {"_id": inv_oid, "withdrawal_pending": {"$ne": True}},
                    {"$set": {"withdrawal_pending": True}},
                    session=session,
                )
                if inv_result.matched_count == 0:
                    raise RuntimeError("already_pending")

                # 3. Insert ship_request document
                insert_result = mongo.db.ship_requests.insert_one({
                    "user_id":          uid,
                    "card_id":          card_oid,
                    "inventory_id":     inv_oid,
                    "card_name":        card["name"],
                    "card_image_url":   card.get("image_url", ""),
                    "shipping_address": shipping_address,
                    "status":           "pending",
                    "admin_note":       None,
                    "created_at":       now,
                    "updated_at":       now,
                    "shipped_at":       None,
                    "rejected_at":      None,
                }, session=session)
                inserted_id = insert_result.inserted_id

    except RuntimeError as exc:
        msg = str(exc)
        if "out_of_stock" in msg:
            return jsonify({"error": "This card is out of stock"}), 409
        if "already_pending" in msg:
            return jsonify({"error": "A shipment request is already pending for this card"}), 409
        return jsonify({"error": "Request failed. Please try again."}), 500
    except Exception:
        return jsonify({"error": "Request failed. Please try again."}), 500

    return jsonify({"ok": True, "request_id": str(inserted_id), "card_name": card["name"]})


@app.route("/api/me/ship-requests", methods=["GET"])
@require_auth
def ship_request_list():
    uid      = ObjectId(g.user_id)
    requests = list(mongo.db.ship_requests.find({"user_id": uid}).sort("created_at", -1))

    result = []
    for r in requests:
        result.append({
            "request_id":       str(r["_id"]),
            "card_id":          str(r["card_id"]),
            "card_name":        r.get("card_name", ""),
            "card_image_url":   r.get("card_image_url", ""),
            "shipping_address": r.get("shipping_address", ""),
            "status":           r.get("status", ""),
            "admin_note":       r.get("admin_note"),
            "created_at":       r["created_at"].isoformat() if r.get("created_at") else None,
            "shipped_at":       r["shipped_at"].isoformat() if r.get("shipped_at") else None,
            "rejected_at":      r["rejected_at"].isoformat() if r.get("rejected_at") else None,
        })

    return jsonify(result)


@app.route("/api/admin/ship-requests", methods=["GET"])
@require_admin
def admin_ship_request_list():
    status_filter = request.args.get("status", "").strip()
    query         = {"status": status_filter} if status_filter else {}

    requests = list(mongo.db.ship_requests.find(query).sort("created_at", -1))

    # Batch user lookup
    user_ids  = list({r["user_id"] for r in requests if r.get("user_id")})
    users_map = {
        str(u["_id"]): u
        for u in mongo.db.users.find({"_id": {"$in": user_ids}})
    }

    result = []
    for r in requests:
        user = users_map.get(str(r.get("user_id")), {})
        result.append({
            "request_id":       str(r["_id"]),
            "card_id":          str(r["card_id"]),
            "card_name":        r.get("card_name", ""),
            "card_image_url":   r.get("card_image_url", ""),
            "shipping_address": r.get("shipping_address", ""),
            "status":           r.get("status", ""),
            "admin_note":       r.get("admin_note"),
            "user_id":          str(r["user_id"]) if r.get("user_id") else None,
            "user_name":        user.get("name", "Unknown"),
            "user_email":       user.get("email", ""),
            "created_at":       r["created_at"].isoformat() if r.get("created_at") else None,
            "updated_at":       r["updated_at"].isoformat() if r.get("updated_at") else None,
            "shipped_at":       r["shipped_at"].isoformat() if r.get("shipped_at") else None,
            "rejected_at":      r["rejected_at"].isoformat() if r.get("rejected_at") else None,
        })

    return jsonify(result)


@app.route("/api/admin/ship-requests/<request_id>/ship", methods=["PATCH"])
@require_admin
def admin_ship_request_ship(request_id):
    try:
        req_oid = ObjectId(request_id)
    except Exception:
        return jsonify({"error": "Invalid request_id"}), 400

    ship_req = mongo.db.ship_requests.find_one({"_id": req_oid})
    if not ship_req:
        return jsonify({"error": "Ship request not found"}), 404
    if ship_req["status"] != "pending":
        return jsonify({"error": f"Request is already in terminal status: {ship_req['status']}"}), 400

    now     = datetime.now(timezone.utc)
    inv_oid  = ship_req["inventory_id"]

    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                # 1. Update status — filter on "pending" guards against double-ship
                req_result = mongo.db.ship_requests.update_one(
                    {"_id": req_oid, "status": "pending"},
                    {"$set": {"status": "shipped", "shipped_at": now, "updated_at": now}},
                    session=session,
                )
                if req_result.matched_count == 0:
                    raise RuntimeError("already_shipped")

                # 2. Handle user inventory: decrement or delete
                inv_row = mongo.db.inventory.find_one({"_id": inv_oid}, session=session)
                if inv_row:
                    if inv_row.get("quantity", 1) > 1:
                        mongo.db.inventory.update_one(
                            {"_id": inv_oid},
                            {"$inc": {"quantity": -1}, "$set": {"withdrawal_pending": False}},
                            session=session,
                        )
                    else:
                        mongo.db.inventory.delete_one({"_id": inv_oid}, session=session)

    except RuntimeError:
        return jsonify({"error": "Request was already shipped"}), 409
    except Exception:
        return jsonify({"error": "Ship failed. Please try again."}), 500

    return jsonify({"ok": True, "request_id": request_id, "status": "shipped"})


@app.route("/api/admin/ship-requests/<request_id>/reject", methods=["PATCH"])
@require_admin
def admin_ship_request_reject(request_id):
    try:
        req_oid = ObjectId(request_id)
    except Exception:
        return jsonify({"error": "Invalid request_id"}), 400

    data       = request.get_json(silent=True) or {}
    admin_note = str(data.get("admin_note", "")).strip() or None

    ship_req = mongo.db.ship_requests.find_one({"_id": req_oid})
    if not ship_req:
        return jsonify({"error": "Ship request not found"}), 404
    if ship_req["status"] != "pending":
        return jsonify({"error": f"Request is already in terminal status: {ship_req['status']}"}), 400

    now      = datetime.now(timezone.utc)
    inv_oid  = ship_req["inventory_id"]
    card_oid = ship_req["card_id"]

    try:
        with mongo.db.client.start_session() as session:
            with session.start_transaction():
                # 1. Update status — filter on "pending" guards against double-reject
                req_result = mongo.db.ship_requests.update_one(
                    {"_id": req_oid, "status": "pending"},
                    {"$set": {
                        "status":      "rejected",
                        "rejected_at": now,
                        "updated_at":  now,
                        "admin_note":  admin_note,
                    }},
                    session=session,
                )
                if req_result.matched_count == 0:
                    raise RuntimeError("already_rejected")

                # 2. Return reserved company_inventory quantity
                mongo.db.company_inventory.update_one(
                    {"card_id": card_oid},
                    {"$inc": {"available_quantity": 1}},
                    session=session,
                )

                # 3. Clear user's withdrawal_pending flag
                mongo.db.inventory.update_one(
                    {"_id": inv_oid},
                    {"$set": {"withdrawal_pending": False}},
                    session=session,
                )

    except RuntimeError:
        return jsonify({"error": "Request was already rejected"}), 409
    except Exception:
        return jsonify({"error": "Reject failed. Please try again."}), 500

    return jsonify({"ok": True, "request_id": request_id, "status": "rejected"})


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({"status": "PackBattles API running"})


if __name__ == "__main__":
    _debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    _port  = int(os.getenv("PORT", 8080))
    app.run(debug=_debug, port=_port)
