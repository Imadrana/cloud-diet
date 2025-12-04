import os
import datetime as dt

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"


def hash_password(password: str) -> str:
    if isinstance(password, str):
        password = password.encode("utf-8")
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        if isinstance(password, str):
            password = password.encode("utf-8")
        if isinstance(hashed, str):
            hashed = hashed.encode("utf-8")
        return bcrypt.checkpw(password, hashed)
    except Exception:
        return False


def create_token(payload: dict, expires_minutes: int = 60) -> str:
    to_encode = payload.copy()
    now = dt.datetime.utcnow()
    to_encode.setdefault("iat", now)
    to_encode["exp"] = now + dt.timedelta(minutes=expires_minutes)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None
