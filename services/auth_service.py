"""Authentication service: registration, credential verification, password hashing."""

import logging
import re

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from sqlalchemy.exc import IntegrityError

from domain.admin import Admin
from domain.customer import Customer
from domain.user import User
from repositories.customer_repository import CustomerRepository

logger = logging.getLogger(__name__)

_ph = PasswordHasher()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
MIN_PASSWORD_LENGTH = 8


class AuthError(Exception):
    """Base class for authentication domain errors."""


class DuplicateEmailError(AuthError):
    """Raised when a registration email is already in use."""


class InvalidCredentialsError(AuthError):
    """Raised when login credentials do not match any account."""


class AuthService:
    """Coordinate registration and login against the customer repository."""

    def __init__(self, customer_repository: CustomerRepository) -> None:
        self._repo = customer_repository

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self, first_name: str, last_name: str, email: str, password: str) -> Customer:
        """Validate inputs, hash the password, persist and return the new customer."""
        first_name = first_name.strip()
        last_name = last_name.strip()
        email = email.strip().lower()
        _validate_registration(first_name, last_name, email, password)

        # Check for duplicate email before hashing (avoids expensive Argon2 work).
        try:
            self._repo.get_user_by_email(email)
            raise DuplicateEmailError("An account with this email address already exists.")
        except KeyError:
            pass  # Good — email is available.

        password_hash = _ph.hash(password)
        full_name = f"{first_name} {last_name}"

        # Use the auto-increment path: id=0 tells the ORM to let the DB assign it.
        customer = Customer(0, full_name, email, password_hash)
        self._repo.add_with_auto_id(customer)
        # Re-fetch to get the database-assigned id.
        return self._repo.get_by_email(email)

    def provision_admin(self, name: str, email: str, password: str) -> Admin:
        """Create an admin or reset an existing admin through the trusted CLI."""
        name = name.strip()
        email = email.strip().lower()
        if not name:
            raise ValueError("Administrator name is required.")
        if len(name) > 120:
            raise ValueError("Administrator name must be 120 characters or fewer.")
        if not EMAIL_RE.match(email):
            raise ValueError("The email address is invalid.")
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
            )
        try:
            existing_user = self._repo.get_user_by_email(email)
        except KeyError:
            existing_user = None
        if existing_user is not None and not isinstance(existing_user, Admin):
            raise DuplicateEmailError("An account with this email address already exists.")
        password_hash = _ph.hash(password)
        if isinstance(existing_user, Admin):
            existing_user.name = name
            existing_user.password_hash = password_hash
            self._repo.update(existing_user)
            return existing_user

        admin = Admin(0, name, email, password_hash)
        try:
            return self._repo.add_admin_with_auto_id(admin)
        except IntegrityError as error:
            raise DuplicateEmailError(
                "An account with this email address already exists."
            ) from error

    # ── Login ─────────────────────────────────────────────────────────────────

    def authenticate(self, email: str, password: str) -> User:
        """Return the user whose credentials match, or raise InvalidCredentialsError."""
        email = email.strip().lower()
        try:
            customer = self._repo.get_user_by_email(email)
        except KeyError:
            _constant_time_dummy_verify()
            raise InvalidCredentialsError("Incorrect email or password.")

        try:
            _ph.verify(customer.password_hash, password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            raise InvalidCredentialsError("Incorrect email or password.")

        # Rehash transparently if the Argon2 parameters have been upgraded.
        if _ph.check_needs_rehash(customer.password_hash):
            try:
                customer.password_hash = _ph.hash(password)
                self._repo.update(customer)
            except Exception:  # pragma: no cover – best-effort
                logger.warning("Password rehash failed for customer %d", customer.id)

        return customer


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_registration(first_name: str, last_name: str, email: str, password: str) -> None:
    errors: list[str] = []
    if not first_name:
        errors.append("First name is required.")
    if not last_name:
        errors.append("Last name is required.")
    if not email or not EMAIL_RE.match(email):
        errors.append("The email address is invalid.")
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")
    if errors:
        raise ValueError(" ".join(errors))


def _constant_time_dummy_verify() -> None:
    """Perform a dummy hash verification to prevent timing attacks on non-existent accounts."""
    try:
        _ph.verify(
            "$argon2id$v=19$m=65536,t=3,p=4$dummysalt1234567890123456$dummyhash1234567890123456789012",
            "dummy-password",
        )
    except Exception:
        pass
