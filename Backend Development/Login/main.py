from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import hash_password, verify_password
from db import users_collection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 用户模型
class User(BaseModel):
    username: str
    password: str

@app.post("/api/signup")
async def signup(user: User):
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = hash_password(user.password)
    await users_collection.insert_one({
        "username": user.username,
        "password": hashed_pw
    })
    return {"message": "User registered successfully"}
@app.post("/api/login")
async def login(user: User):
    found_user = await users_collection.find_one({"username": user.username})
    if not found_user or not verify_password(user.password, found_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful"}