"""Interactively create or reset an administrator account."""

from getpass import getpass

from database import Database, upgrade_schema
from main import build_application
from repositories.customer_repository import CustomerRepository
from services.auth_service import AuthService, DuplicateEmailError


def main() -> int:
    """Provision an admin without exposing it through the public API."""
    database = Database()
    try:
        upgrade_schema(database)
        build_application(database)
        auth_service = AuthService(CustomerRepository(database))
        name = input("Administrator name: ").strip()
        email = input("Administrator email: ").strip()
        password = getpass("Password (at least 8 characters): ")
        confirmation = getpass("Confirm password: ")
        if password != confirmation:
            print("Passwords do not match.")
            return 1
        admin = auth_service.provision_admin(name, email, password)
        print(f"Administrator account created or reset for {admin.email}.")
        return 0
    except (ValueError, DuplicateEmailError, RuntimeError) as error:
        print(f"Could not create administrator: {error}")
        return 1
    finally:
        database.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
