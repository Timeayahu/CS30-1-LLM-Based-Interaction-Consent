from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from redis_client import r
from auth import hash_password, verify_password

app = FastAPI()

class User(BaseModel):
    username: str
    password: str

@app.post("/api/signup")
def signup(user: User):
    key = f"user:{user.username}"
    if r.exists(key):
        raise HTTPException(status_code=400, detail="User already exists")
    r.hset(key, mapping={"password": hash_password(user.password)})
    return {"message": "User registered successfully"}

@app.post("/api/login")
def login(user: User):
    key = f"user:{user.username}"
    if not r.exists(key):
        raise HTTPException(status_code=400, detail="User not found")
    stored_password = r.hget(key, "password")
    if not verify_password(user.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful"}
