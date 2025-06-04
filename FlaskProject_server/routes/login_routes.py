from flask import Blueprint, request, jsonify
from services.login.auth import verify_password, hash_password
from models.mongodb_ec2_login import (
    connect_to_mongodb,
    close_mongodb_connection,
    get_user_collection,
    get_admin_collection,
)
from services.cache.redis_ec2 import connect_to_redis, close_redis_connection, read_result_from_redis


login_bp = Blueprint('login', __name__)

# create the route for user registration
@login_bp.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"detail": "Username and password required"}), 400

    client, db = connect_to_mongodb()

    users_collection = get_user_collection(db)
    admin_collection = get_admin_collection(db)

    # check if the user already exists
    if users_collection.find_one({"username": username}) or admin_collection.find_one({"username": username}):
        close_mongodb_connection(client)
        return jsonify({"detail": "User already exists"}), 400
    # hash the password
    hashed_pw = hash_password(password)

    # if the username is admin_user, then add the user to the admin collection
    if username == "admin_user":
        admin_collection.insert_one({
            "username": username,
            "password": hashed_pw
        })
        close_mongodb_connection(client)
        return jsonify({"message": "Admin registered successfully"}), 200
    else:
        # add the user to the user collection
        users_collection.insert_one({
            "username": username,
            "password": hashed_pw
        })
        close_mongodb_connection(client)
        return jsonify({"message": "User registered successfully"}), 200


# create the route for user login
@login_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    # check if the username and password are provided
    if not username or not password:
        return jsonify({"detail": "Username and password required"}), 400

    client, db = connect_to_mongodb()

    # get the user and admin collections
    users_collection = get_user_collection(db)
    admin_collection = get_admin_collection(db)

    # check if the user exists
    found_user = users_collection.find_one({"username": username})
    if found_user and verify_password(password, found_user["password"]):
        close_mongodb_connection(client)
        return jsonify({"message": "Login successful", "role": "user"}), 200

    found_admin = admin_collection.find_one({"username": username})
    if found_admin and verify_password(password, found_admin["password"]):
        close_mongodb_connection(client)
        return jsonify({"message": "Login successful", "role": "admin"}), 200

    close_mongodb_connection(client)
    return jsonify({"detail": "Invalid credentials"}), 401


# create the route for toggling the visibility of a feature
@login_bp.route("/api/toggle_visibility", methods=["POST"])
def toggle_visibility():
    data = request.get_json()
    username = data.get("username")
    feature = data.get("feature")
    visible = data.get("visible")

    # check if the username, feature and visible are provided
    if not username or feature is None or visible is None:
        return jsonify({"detail": "Missing required fields"}), 400

    client, db = connect_to_mongodb()

    # get the admin collection
    admin_collection = get_admin_collection(db)
    admin = admin_collection.find_one({"username": username})

    # check if the admin exists
    if not admin:
        close_mongodb_connection(client)
        return jsonify({"detail": "Not authorized"}), 403

    # set the visibility of the feature
    r = connect_to_redis()
    r.set(feature, "1" if visible else "0")
    close_mongodb_connection(client)
    close_redis_connection(r)

    return jsonify({"message": f"{feature} visibility set to {visible}"}), 200


# create the route for getting the visibility of a feature
@login_bp.route("/api/get_visibility", methods=["GET"])
def get_visibility():
    feature = request.args.get("feature", "extension")

    # get the visibility of the feature
    client = connect_to_redis()
    result = read_result_from_redis(client, feature)
    if not result:
        close_redis_connection(client)
        return jsonify({"feature": feature, "visible": False}), 200

    close_redis_connection(client)
    return jsonify({"feature": feature, "visible": True if result == "1" else False}), 200
