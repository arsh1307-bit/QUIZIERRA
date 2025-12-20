# app/routers/users.py
from fastapi import APIRouter
from pydantic import BaseModel
import hashlib

router = APIRouter()

class CreateUser(BaseModel):
    username: str

@router.post("/create")
def create_user(u: CreateUser):
    # minimal hashed user id
    uid = hashlib.sha256(u.username.encode()).hexdigest()[:12]
    return {"user_hash": uid, "note": "Use this hashed id for interactions"}
