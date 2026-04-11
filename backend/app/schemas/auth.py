"""Authentication schemas."""

from pydantic import BaseModel


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token payload."""

    sub: str | None = None
    role: str | None = None


class LoginRequest(BaseModel):
    """Login request body."""

    username: str
    password: str


class RegisterRequest(BaseModel):
    """Public student registration request body."""

    username: str
    password: str
    display_name: str | None = None
