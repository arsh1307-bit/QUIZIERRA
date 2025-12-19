# app/routers/users.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
from passlib.context import CryptContext
from app.services.adaptive_engine import ensure_user

# Use passlib for secure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

# This is not a production-ready user store. 
# In a real app, use a proper database (e.g., PostgreSQL with a users table).
# For this fix, we will simulate a user store and link it to the adaptive engine.
fake_users_db = {}

class UserCreate(BaseModel):
    username: str
    password: str

class UserPublic(BaseModel):
    user_id: str
    username: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/register", response_model=UserPublic)
async def register_user(user: UserCreate):
    """
    Register a new user with a username and password.
    Passwords are securely hashed using bcrypt.
    User IDs are generated as random UUIDs.
    This is a secure replacement for the original, vulnerable user creation endpoint.
    """
    # Check if username already exists in our fake DB
    if any(u['username'] == user.username for u in fake_users_db.values()):
        raise HTTPException(status_code=400, detail="Username already registered")

    user_id = str(uuid.uuid4()) # Generate a secure, random user ID
    hashed_password = get_password_hash(user.password)
    
    # Store user in our fake DB
    fake_users_db[user_id] = {
        "user_id": user_id,
        "username": user.username,
        "hashed_password": hashed_password
    }
    
    # Also ensure the user exists in the adaptive engine with a starting skill level
    # We use the new, secure user_id as the 'user_hash'
    ensure_user(user_hash=user_id)
    
    return {"user_id": user_id, "username": user.username}

# The original /create and /get_or_create endpoints have been removed.
# They were critically insecure due to the following reasons:
# 1. Hashing usernames directly with SHA256 without a salt, making them easy to reverse-engineer.
# 2. Truncating the hash, which dramatically increases the risk of collisions, allowing users to potentially impersonate each other.
# 3. Exposing a method to create users from a simple, predictable hash.
# 
# Secure user management should always involve random, unpredictable user IDs (like UUIDs) 
# and securely hashed passwords using a slow, salted hashing algorithm like bcrypt.
