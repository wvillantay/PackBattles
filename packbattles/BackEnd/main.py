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
# Health check
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return jsonify({"status": "PackBattles API running"})


if __name__ == "__main__":
    app.run(debug=True, port=8080)
