from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.login_db

users_collection = db.get_collection("users")
admin_collection = db.get_collection("admin")
visibility_collection = db.get_collection("visibility")
