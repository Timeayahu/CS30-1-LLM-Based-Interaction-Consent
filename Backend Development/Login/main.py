from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import hash_password, verify_password
from db import users_collection, admin_collection, visibility_collection

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

# 功能状态模型
class VisibilityToggle(BaseModel):
    username: str  # 管理员用户名
    feature: str   # 功能名，比如 "extension"
    visible: bool  # 是否可见

@app.post("/api/signup")
async def signup(user: User):
    # 检查是否存在于任意集合中
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
    # 验证是否是管理员
    admin = await admin_collection.find_one({"username": status.username})
    if not admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 更新或插入功能状态
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
        return {"feature": feature, "visible": False}  # 默认不可见
    return {"feature": feature, "visible": result["visible"]}
