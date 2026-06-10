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
CORS(app, origins="*")
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
            "id":      str(user["_id"]),
            "name":    user["name"],
            "email":   user["email"],
            "credits": user["credits"],
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
        "id":      str(user["_id"]),
        "name":    user["name"],
        "email":   user["email"],
        "credits": user["credits"],
        "wins":    user["wins"],
        "losses":  user["losses"],
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

    user = mongo.db.users.find_one({"_id": ObjectId(g.user_id)})
    if user["credits"] < pack["cost"]:
        return jsonify({"error": "Insufficient credits"}), 400

    pool        = pack["pool"]
    card_ids    = [e["card_id"] for e in pool]
    weights     = [e["weight"]  for e in pool]
    drawn_ids   = random.choices(card_ids, weights=weights, k=pack["cards_per_open"])
    drawn_cards = [mongo.db.cards.find_one({"_id": cid}) for cid in drawn_ids]

    new_credits = user["credits"] - pack["cost"]
    mongo.db.users.update_one(
        {"_id": ObjectId(g.user_id)},
        {"$set": {"credits": new_credits}},
    )

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
    user       = mongo.db.users.find_one({"_id": creator_id})
    if user["credits"] < total_cost:
        return jsonify({"error": "Insufficient credits"}), 400

    # Draw pack_quantity packs for the creator — stored hidden until battle resolves
    all_drawn_ids = []
    creator_total  = 0.0
    for _ in range(pack_quantity):
        ids, _docs, subtotal = _draw_from_pack(pack)
        all_drawn_ids.extend(ids)
        creator_total += subtotal

    # Deduct total cost from creator
    mongo.db.users.update_one(
        {"_id": creator_id},
        {"$inc": {"credits": -total_cost}},
    )

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

    opponent = mongo.db.users.find_one({"_id": opponent_id})
    if opponent["credits"] < total_cost:
        return jsonify({"error": "Insufficient credits"}), 400

    # Draw pack_quantity packs for the opponent
    opp_drawn_ids  = []
    opp_drawn_docs = []
    opponent_total = 0.0
    for _ in range(pack_quantity):
        ids, docs, subtotal = _draw_from_pack(pack)
        opp_drawn_ids.extend(ids)
        opp_drawn_docs.extend(docs)
        opponent_total += subtotal

    # Deduct total cost from opponent
    mongo.db.users.update_one(
        {"_id": opponent_id},
        {"$inc": {"credits": -total_cost}},
    )

    # Resolve: higher total wins; exact tie → coin flip
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

    loser_id  = opponent_id if winner_id == battle["creator_id"] else battle["creator_id"]
    now       = datetime.now(timezone.utc)
    all_cards = battle["creator_cards"] + opp_drawn_ids

    # Transfer all drawn cards to winner's inventory
    for cid in all_cards:
        mongo.db.inventory.update_one(
            {"user_id": winner_id, "card_id": cid},
            {
                "$inc":         {"quantity": 1},
                "$setOnInsert": {"acquired_at": now},
            },
            upsert=True,
        )

    # Update win / loss records
    mongo.db.users.update_one({"_id": winner_id}, {"$inc": {"wins":   1}})
    mongo.db.users.update_one({"_id": loser_id},  {"$inc": {"losses": 1}})

    # Finalise battle document
    mongo.db.battles.update_one(
        {"_id": bid},
        {"$set": {
            "status":         "completed",
            "opponent_id":    opponent_id,
            "opponent_cards": opp_drawn_ids,
            "opponent_total": opponent_total,
            "winner_id":      winner_id,
            "tiebreaker":     tiebreaker,
            "completed_at":   now,
        }},
    )

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
        pack       = mongo.db.packs.find_one({"_id": b["pack_id"]}, {"name": 1, "cost": 1})
        pack_name  = pack["name"] if pack else "Unknown"
        qty        = b.get("pack_quantity", 1)
        total_cost = b.get("pack_cost", 0) * qty
        status     = b["status"]
        is_creator = b["creator_id"] == uid
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
                creator = mongo.db.users.find_one({"_id": b["creator_id"]}, {"name": 1})
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


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({"status": "PackBattles API running"})


if __name__ == "__main__":
    app.run(debug=True, port=8080)
