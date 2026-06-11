import os
import random
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

    rows = mongo.db.inventory.find({"user_id": ObjectId(g.user_id)})

    result = []
    for row in rows:
        card = mongo.db.cards.find_one({"_id": row["card_id"]})
        if card:
            result.append({
                "inventory_id": str(row["_id"]),
                "card_id":      str(card["_id"]),
                "name":         card["name"],
                "image_url":    card["image_url"],
                "rarity":       card["rarity"],
                "value":        card["value"],
                "quantity":     row["quantity"],
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
# Health check
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({"status": "PackBattles API running"})


if __name__ == "__main__":
    _debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    _port  = int(os.getenv("PORT", 8080))
    app.run(debug=_debug, port=_port)
