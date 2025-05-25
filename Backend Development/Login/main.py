from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import hash_password, verify_password
from db import users_collection, admin_collection, visibility_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# user model
class User(BaseModel):
    username: str
    password: str

# feature status model
class VisibilityToggle(BaseModel):
    username: str  # admin username
    feature: str   # feature name, like "extension"
    visible: bool  # whether visible

@app.post("/api/signup")
async def signup(user: User):
    # check if the user exists in any collection
    existing_user = await users_collection.find_one({"username": user.username})
    existing_admin = await admin_collection.find_one({"username": user.username})
    if existing_user or existing_admin:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = hash_password(user.password)

    if user.username == "admin_user":
        await admin_collection.insert_one({
            "username": user.username,
            "password": hashed_pw
        })
        return {"message": "Admin registered successfully"}
    else:
        await users_collection.insert_one({
            "username": user.username,
            "password": hashed_pw
        })
        return {"message": "User registered successfully"}

@app.post("/api/login")
async def login(user: User):
    found_user = await users_collection.find_one({"username": user.username})
    if found_user and verify_password(user.password, found_user["password"]):
        return {"message": "Login successful", "role": "user"}

    found_admin = await admin_collection.find_one({"username": user.username})
    if found_admin and verify_password(user.password, found_admin["password"]):
        return {"message": "Login successful", "role": "admin"}

    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/toggle_visibility")
async def toggle_visibility(status: VisibilityToggle):
    # check if the user is admin
    admin = await admin_collection.find_one({"username": status.username})
    if not admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # update or insert feature status
    await visibility_collection.update_one(
        {"feature": status.feature},
        {"$set": {"visible": status.visible}},
        upsert=True
    )
    return {"message": f"{status.feature} visibility set to {status.visible}"}

@app.get("/api/get_visibility")
async def get_visibility(feature: str = "extension"):
    result = await visibility_collection.find_one({"feature": feature})
    if not result:
        return {"feature": feature, "visible": False}  # default not visible
    return {"feature": feature, "visible": result["visible"]}
