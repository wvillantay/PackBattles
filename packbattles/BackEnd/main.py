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
        result.append({
            "id":           str(b["_id"]),
            "creator_id":   str(b["creator_id"]),
            "creator_name": creator["name"] if creator else "Unknown",
            "pack_id":      str(b["pack_id"]),
            "pack_name":    pack["name"]    if pack    else "Unknown",
            "pack_cost":    pack["cost"]    if pack    else 0,
            "created_at":   b["created_at"].isoformat(),
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

    creator_id = ObjectId(g.user_id)
    user       = mongo.db.users.find_one({"_id": creator_id})
    if user["credits"] < pack["cost"]:
        return jsonify({"error": "Insufficient credits"}), 400

    # Draw the creator's pack — stored hidden until the battle resolves
    drawn_ids, _drawn_docs, creator_total = _draw_from_pack(pack)

    # Deduct pack cost from creator
    mongo.db.users.update_one(
        {"_id": creator_id},
        {"$inc": {"credits": -pack["cost"]}},
    )

    now    = datetime.now(timezone.utc)
    result = mongo.db.battles.insert_one({
        "type":           "duel",
        "status":         "open",
        "pack_id":        pack_oid,
        "pack_cost":      pack["cost"],
        "creator_id":     creator_id,
        "creator_cards":  drawn_ids,
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
        "id":         str(result.inserted_id),
        "status":     "open",
        "creator_id": str(creator_id),
        "pack_id":    str(pack_oid),
        "pack_name":  pack["name"],
        "pack_cost":  pack["cost"],
        "created_at": now.isoformat(),
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

    base = {
        "id":         str(battle["_id"]),
        "type":       battle["type"],
        "status":     battle["status"],
        "pack_id":    str(battle["pack_id"]),
        "pack_name":  pack["name"] if pack else "Unknown",
        "pack_cost":  pack["cost"] if pack else 0,
        "creator_id": str(battle["creator_id"]),
        "created_at": battle["created_at"].isoformat(),
    }

    if battle["status"] == "completed":
        creator  = mongo.db.users.find_one({"_id": battle["creator_id"]}, {"name": 1})
        opponent = mongo.db.users.find_one({"_id": battle["opponent_id"]}, {"name": 1})
        base.update({
            "creator_name":   creator["name"]  if creator  else "Unknown",
            "creator_total":  battle["creator_total"],
            "creator_cards":  [_card_detail(mongo.db.cards.find_one({"_id": cid}))
                               for cid in battle["creator_cards"]],
            "opponent_id":    str(battle["opponent_id"]),
            "opponent_name":  opponent["name"] if opponent else "Unknown",
            "opponent_total": battle["opponent_total"],
            "opponent_cards": [_card_detail(mongo.db.cards.find_one({"_id": cid}))
                               for cid in battle["opponent_cards"]],
            "winner_id":      str(battle["winner_id"]),
            "tiebreaker":     battle.get("tiebreaker"),
            "completed_at":   battle["completed_at"].isoformat(),
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

    opponent = mongo.db.users.find_one({"_id": opponent_id})
    if opponent["credits"] < pack["cost"]:
        return jsonify({"error": "Insufficient credits"}), 400

    # Draw opponent's pack
    opp_drawn_ids, opp_drawn_docs, opponent_total = _draw_from_pack(pack)

    # Deduct pack cost from opponent
    mongo.db.users.update_one(
        {"_id": opponent_id},
        {"$inc": {"credits": -pack["cost"]}},
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
        "creator_id":     str(battle["creator_id"]),
        "creator_name":   creator["name"]  if creator  else "Unknown",
        "creator_total":  creator_total,
        "creator_cards":  creator_card_details,
        "opponent_id":    str(opponent_id),
        "opponent_name":  opp_user["name"] if opp_user else "Unknown",
        "opponent_total": opponent_total,
        "opponent_cards": opponent_card_details,
        "winner_id":      str(winner_id),
        "tiebreaker":     tiebreaker,
        "completed_at":   now.isoformat(),
    })


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({"status": "PackBattles API running"})


if __name__ == "__main__":
    app.run(debug=True, port=8080)
