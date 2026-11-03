"""Session-based authentication endpoints for the TOUR Angular frontend."""

import logging

from flask import Blueprint, jsonify, request, session
from sqlalchemy.exc import SQLAlchemyError

from domain.admin import Admin
from domain.user import User
from services.auth_service import (
    AuthService,
    DuplicateEmailError,
    InvalidCredentialsError,
)

logger = logging.getLogger(__name__)

SESSION_CUSTOMER_ID_KEY = "customer_id"
SESSION_ADMIN_ID_KEY = "admin_id"


def create_auth_blueprint(get_auth_service) -> Blueprint:
    """Return the /api/auth Blueprint wired to the supplied auth service factory."""
    auth = Blueprint("tour_auth", __name__, url_prefix="/api/auth")

    # ── POST /api/auth/register ───────────────────────────────────────────────

    @auth.post("/register")
    def register():
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return _error("The request body must be a JSON object.", 400)

        first_name = str(body.get("first_name", "")).strip()
        last_name = str(body.get("last_name", "")).strip()
        email = str(body.get("email", "")).strip()
        password = str(body.get("password", ""))
        confirm = str(body.get("password_confirm", ""))

        if password != confirm:
            return _error("Passwords do not match.", 400)

        try:
            customer = get_auth_service().register(first_name, last_name, email, password)
        except DuplicateEmailError as exc:
            return _error(str(exc), 409)
        except ValueError as exc:
            return _error(str(exc), 400)
        except SQLAlchemyError:
            logger.exception("Registration database error")
            return _error("The service is temporarily unavailable.", 503)

        _start_session(customer)
        return jsonify(_user_json(customer)), 201

    # ── POST /api/auth/login ──────────────────────────────────────────────────

    @auth.post("/login")
    def login():
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return _error("The request body must be a JSON object.", 400)

        email = str(body.get("email", "")).strip()
        password = str(body.get("password", ""))

        if not email or not password:
            return _error("Email and password are required.", 400)

        try:
            user = get_auth_service().authenticate(email, password)
        except InvalidCredentialsError as exc:
            return _error(str(exc), 401)
        except SQLAlchemyError:
            logger.exception("Login database error")
            return _error("The service is temporarily unavailable.", 503)

        _start_session(user)
        return jsonify(_user_json(user)), 200

    # ── GET /api/auth/me ──────────────────────────────────────────────────────

    @auth.get("/me")
    def me():
        user_id = session.get(SESSION_ADMIN_ID_KEY) or session.get(
            SESSION_CUSTOMER_ID_KEY
        )
        if not user_id:
            return _error("Not authenticated.", 401)
        try:
            user = get_auth_service()._repo.get_user_by_id(user_id)
        except KeyError:
            session.clear()
            return _error("Invalid session.", 401)
        except SQLAlchemyError:
            logger.exception("Profile fetch database error")
            return _error("The service is temporarily unavailable.", 503)
        return jsonify(_user_json(user)), 200

    # ── POST /api/auth/logout ─────────────────────────────────────────────────

    @auth.post("/logout")
    def logout():
        session.clear()
        return jsonify({"message": "Successfully logged out."}), 200

    return auth


# ── Helpers ───────────────────────────────────────────────────────────────────

def _start_session(user: User) -> None:
    session.clear()
    if isinstance(user, Admin):
        session[SESSION_ADMIN_ID_KEY] = user.id
    else:
        session[SESSION_CUSTOMER_ID_KEY] = user.id
    session.permanent = True


def _user_json(user: User) -> dict:
    """Return a safe user representation (no password hash)."""
    parts = user.name.split(" ", 1)
    return {
        "id": user.id,
        "name": user.name,
        "first_name": parts[0] if parts else user.name,
        "last_name": parts[1] if len(parts) > 1 else "",
        "email": user.email,
        "role": "admin" if isinstance(user, Admin) else "customer",
    }


def _error(message: str, status: int):
    return jsonify({"error": message}), status


def require_auth():
    """Return the authenticated customer_id from the session, or None."""
    return session.get(SESSION_CUSTOMER_ID_KEY)
