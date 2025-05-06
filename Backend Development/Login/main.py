from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis_client import r
from auth import hash_password, verify_password

app = FastAPI()

# 添加 CORS 中间件
origins = [
    "http://localhost:3000",  # 本地前端地址
    "http://127.0.0.1:3000",
    # 你可以根据需要添加更多前端源
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # 允许的前端源
    allow_credentials=True,
    allow_methods=["*"],              # 允许所有方法（包括 OPTIONS）
    allow_headers=["*"],              # 允许所有请求头
)

# 用户数据模型
class User(BaseModel):
    username: str
    password: str

# 注册接口
@app.post("/api/signup")
def signup(user: User):
    key = f"user:{user.username}"
    if r.exists(key):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = hash_password(user.password)
    print(f"Hashed password: {hashed_password}")

    r.hset(key, mapping={"password": hashed_password})
    return {"message": "User registered successfully"}

# 登录接口
@app.post("/api/login")
def login(user: User):
    key = f"user:{user.username}"
    if not r.exists(key):
        raise HTTPException(status_code=400, detail="User not found")

    stored_password = r.hget(key, "password")
    if not verify_password(user.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"message": "Login successful"}
