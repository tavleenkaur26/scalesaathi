from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import create_token, get_current_user, hash_password, require_role, verify_password
from backend.config import settings
from backend.constants import ADMIN, ROLES, TESTER
from backend.db import get_db
from backend.models import Lab, User
from backend.services.seed import DEMO_USERS

router = APIRouter(tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    email: str = Field(min_length=5, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1)
    designation: Optional[str] = None


class UserCreateIn(RegisterIn):
    role: str


def _token_response(user: User) -> dict:
    return {"access_token": create_token(user), "token_type": "bearer", "role": user.role,
            "full_name": user.full_name, "user_id": user.id}


def _create_user(db: Session, body: RegisterIn, role: str) -> User:
    email = body.email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(409, "An account with this email already exists")
    lab = db.query(Lab).first()
    user = User(email=email, password_hash=hash_password(body.password), full_name=body.full_name.strip(),
                designation=body.designation, role=role, lab_id=lab.id if lab else None)
    db.add(user)
    db.commit()
    return user


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == body.email.strip().lower()).first()
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return _token_response(user)


@router.post("/auth/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """Public sign-up. Always creates a Tester: Reviewer/Admin accounts can only be made by an Admin."""
    return _token_response(_create_user(db, body, TESTER))


@router.post("/users", status_code=201)
def create_user(body: UserCreateIn, db: Session = Depends(get_db), admin: User = Depends(require_role(ADMIN))):
    """Admin creates an account with any role."""
    if body.role not in ROLES:
        raise HTTPException(422, f"role must be one of {list(ROLES)}")
    u = _create_user(db, body, body.role)
    return {"user_id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"user_id": user.id, "email": user.email, "full_name": user.full_name,
            "designation": user.designation, "role": user.role}


@router.get("/auth/demo-users")
def demo_users():
    """Public, for the login page's credential hints. Demo deployments only."""
    return [{"email": e, "role": r, "full_name": n, "password": settings.demo_password}
            for e, r, n, _ in DEMO_USERS]