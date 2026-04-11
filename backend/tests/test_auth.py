"""
Tests for authentication endpoints.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.student import UserRole


class TestRegister:
    """Tests for POST /auth/register."""

    def test_register_student_success(
        self,
        client: TestClient,
        db: Session,
    ):
        """Test a new student can register."""
        response = client.post(
            "/auth/register",
            json={
                "username": "newstudent",
                "password": "strongpass123",
                "display_name": "New Student",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newstudent"
        assert data["role"] == "student"
        assert data["display_name"] == "New Student"
        assert "password_hash" not in data

        created = db.query(Student).filter(Student.username == "newstudent").first()
        assert created is not None
        assert created.role == UserRole.STUDENT
        assert created.password_hash != "strongpass123"

    def test_register_duplicate_username_fails(
        self,
        client: TestClient,
        student_user: Student,
    ):
        """Test registration rejects an existing username."""
        response = client.post(
            "/auth/register",
            json={
                "username": "teststudent",
                "password": "anotherpass123",
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Username already exists"


class TestLogin:
    """Tests for POST /auth/login."""

    def test_login_success(
        self,
        client: TestClient,
        student_user: Student,
    ):
        """Test successful login returns JWT token."""
        response = client.post(
            "/auth/login",
            json={"username": "teststudent", "password": "studentpass123"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(
        self,
        client: TestClient,
        student_user: Student,
    ):
        """Test login with wrong password returns 401."""
        response = client.post(
            "/auth/login",
            json={"username": "teststudent", "password": "wrongpassword"},
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect username or password"

    def test_login_nonexistent_user(self, client: TestClient, db: Session):
        """Test login with non-existent user returns 401."""
        response = client.post(
            "/auth/login",
            json={"username": "nobody", "password": "whatever"},
        )
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect username or password"

    def test_login_admin(
        self,
        client: TestClient,
        admin_user: Student,
    ):
        """Test admin can also login."""
        response = client.post(
            "/auth/login",
            json={"username": "testadmin", "password": "adminpass123"},
        )
        
        assert response.status_code == 200
        assert "access_token" in response.json()


class TestMe:
    """Tests for GET /auth/me."""

    def test_me_authenticated(
        self,
        client: TestClient,
        student_user: Student,
        student_headers: dict,
    ):
        """Test /me returns current user info."""
        response = client.get("/auth/me", headers=student_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "teststudent"
        assert data["display_name"] == "Test Student"
        assert data["role"] == "student"
        assert "password_hash" not in data

    def test_me_unauthenticated(self, client: TestClient, db: Session):
        """Test /me without token returns 403."""
        response = client.get("/auth/me")
        
        assert response.status_code == 403

    def test_me_invalid_token(self, client: TestClient, db: Session):
        """Test /me with invalid token returns 401."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalidtoken"},
        )
        
        assert response.status_code == 401

    def test_me_admin(
        self,
        client: TestClient,
        admin_user: Student,
        admin_headers: dict,
    ):
        """Test /me works for admin too."""
        response = client.get("/auth/me", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testadmin"
        assert data["role"] == "admin"
