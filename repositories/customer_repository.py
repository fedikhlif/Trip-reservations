"""SQLAlchemy persistence for customers and admins in the shared users table."""

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Database
from domain.admin import Admin
from domain.customer import Customer
from domain.user import User
from models import UserModel, UserRole
from repositories.mappers import user_to_domain


class CustomerRepository:
    """Store Customer and Admin instances as rows in ``users``."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def add(self, customer: Customer) -> None:
        """Insert a customer; email uniqueness and IDs are enforced by SQLite."""
        if not isinstance(customer, Customer):
            raise TypeError("CustomerRepository.add expects a Customer.")
        self._insert_user(customer, UserRole.CUSTOMER)

    def add_admin(self, admin: Admin) -> None:
        """Insert an administrator into the shared users table."""
        if not isinstance(admin, Admin):
            raise TypeError("add_admin expects an Admin.")
        self._insert_user(admin, UserRole.ADMIN)

    def _insert_user(self, user: User, role: UserRole) -> None:
        with self.database.session_scope() as session:
            session.add(
                UserModel(
                    id=user.id,
                    name=user.name,
                    email=user.email,
                    password_hash=user.password_hash,
                    role=role,
                )
            )

    def get_by_id(
        self, customer_id: int, session: Session | None = None
    ) -> Customer:
        """Return a customer by ID, not an administrator."""
        try:
            user = self.get_user_by_id(customer_id, session)
        except KeyError as error:
            raise KeyError(f"Customer {customer_id} was not found.") from error
        if not isinstance(user, Customer):
            raise KeyError(f"Customer {customer_id} was not found.")
        return user

    def get_user_by_id(
        self, user_id: int, session: Session | None = None
    ) -> User:
        """Return either user subtype from its shared table row."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_user_by_id(user_id, session)
        model = session.get(UserModel, user_id)
        if model is None:
            raise KeyError(f"User {user_id} was not found.")
        return user_to_domain(model)

    def get_all(self) -> list[Customer]:
        """Return all customers, excluding administrators."""
        with self.database.session_scope() as session:
            models = session.scalars(
                select(UserModel)
                .where(UserModel.role == UserRole.CUSTOMER)
                .order_by(UserModel.id)
            ).all()
            return [cast(Customer, user_to_domain(model)) for model in models]

    def update(self, user: User) -> None:
        """Update a user without changing its stored role."""
        role = UserRole.ADMIN if isinstance(user, Admin) else UserRole.CUSTOMER
        with self.database.session_scope() as session:
            model = session.get(UserModel, user.id)
            if model is None or model.role is not role:
                raise KeyError(f"User {user.id} was not found with role {role.value}.")
            model.name = user.name
            model.email = user.email
            model.password_hash = user.password_hash

    def delete(self, customer_id: int) -> None:
        """Delete an unreferenced customer; foreign keys preserve history."""
        with self.database.session_scope() as session:
            model = session.get(UserModel, customer_id)
            if model is None or model.role is not UserRole.CUSTOMER:
                raise KeyError(f"Customer {customer_id} was not found.")
            session.delete(model)

    def transaction(self):
        """Expose a database session transaction for coordinated workflows."""
        return self.database.session_scope()