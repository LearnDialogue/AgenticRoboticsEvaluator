"""Authentication routes."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DBSession, CurrentUser
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.student import Student
from app.models.student import UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.student import StudentRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: DBSession) -> Student:
    """
    Register a new student account.
    """
    existing = db.query(Student).filter(Student.username == request.username).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    student = Student(
        username=request.username,
        password_hash=get_password_hash(request.password),
        role=UserRole.STUDENT,
        display_name=request.display_name,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    return student


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: DBSession) -> Token:
    """
    Authenticate user and return JWT token.
    """
    user = db.query(Student).filter(Student.username == request.username).first()

    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )

    return Token(access_token=access_token)


@router.get("/me", response_model=StudentRead)
def get_current_user_info(current_user: CurrentUser) -> Student:
    """
    Get current authenticated user's info.
    """
    return current_user
