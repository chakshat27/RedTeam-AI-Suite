"""
Authentication utilities for password hashing and JWT token handling.
Uses standard Python cryptography (hashlib, hmac, secrets) to guarantee zero setup issues.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET_KEY = "red-team-suite-jwt-secret-local-key-secure"
TOKEN_EXPIRATION_SECONDS = 86400 * 7  # 7 days

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Hash password using PBKDF2 with SHA256 and salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return hashed, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify password against stored hash and salt."""
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, stored_hash)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    """Generate a signed JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRATION_SECONDS,
    }

    header_bytes = _b64url_encode(json.dumps(header).encode("utf-8"))
    payload_bytes = _b64url_encode(json.dumps(payload).encode("utf-8"))
    token_data = f"{header_bytes}.{payload_bytes}"

    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        token_data.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    sig_bytes = _b64url_encode(signature)

    return f"{token_data}.{sig_bytes}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify JWT token signature and expiration."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        token_data = f"{header_b64}.{payload_b64}"

        expected_sig = hmac.new(
            SECRET_KEY.encode("utf-8"),
            token_data.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        actual_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> dict | None:
    """FastAPI dependency to extract and validate logged-in user from Bearer header."""
    token = None
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_store = getattr(request.app.state, "user_store", None)
    if not user_store:
        return None

    user = await user_store.get_user_by_id(payload.get("sub"))
    return user
