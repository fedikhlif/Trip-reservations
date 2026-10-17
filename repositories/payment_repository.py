"""SQLAlchemy persistence for simulated payments."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Database
from domain.payment import Payment
from models import PaymentModel
from repositories.mappers import payment_to_domain
from repositories.reservation_repository import ReservationRepository


class PaymentRepository:
    """Store payments with one-payment-per-reservation enforced by SQLite."""

    def __init__(
        self, database: Database, reservations: ReservationRepository
    ) -> None:
        self.database = database
        self.reservations = reservations

    def add(
        self, payment: Payment, session: Session | None = None
    ) -> None:
        """Insert a payment and assign an ID if the model has no explicit ID."""
        if session is None:
            with self.database.session_scope() as session:
                self.add(payment, session)
            return
        model = PaymentModel(
            id=payment.id or None,
            reservation_id=payment.reservation.id,
            amount=payment.amount,
            method=payment.method,
            status=payment.status,
        )
        session.add(model)
        session.flush()
        payment.id = model.id
        payment.reservation.payment = payment

    def get_by_id(
        self,
        payment_id: int,
        session: Session | None = None,
        for_update: bool = False,
    ) -> Payment:
        """Return a payment or raise a descriptive error."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_by_id(payment_id, session, for_update)
        statement = select(PaymentModel).where(PaymentModel.id == payment_id)
        if for_update:
            statement = statement.with_for_update()
        model = session.scalar(statement)
        if model is None:
            raise KeyError(f"Payment {payment_id} was not found.")
        return payment_to_domain(model)

    def get_all(self) -> list[Payment]:
        """Return all payments in ID order."""
        with self.database.session_scope() as session:
            models = session.scalars(
                select(PaymentModel).order_by(PaymentModel.id)
            ).all()
            return [payment_to_domain(model) for model in models]

    def get_by_reservation_id(
        self,
        reservation_id: int,
        session: Session | None = None,
    ) -> Payment | None:
        """Return the unique payment for a reservation, when present."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_by_reservation_id(reservation_id, session)
        model = session.scalar(
            select(PaymentModel).where(
                PaymentModel.reservation_id == reservation_id
            )
        )
        return payment_to_domain(model) if model is not None else None

    def update(
        self, payment: Payment, session: Session | None = None
    ) -> None:
        """Update a payment's amount, method, and status."""
        if session is None:
            with self.database.session_scope() as session:
                self.update(payment, session)
            return
        model = session.get(PaymentModel, payment.id)
        if model is None:
            raise KeyError(f"Payment {payment.id} was not found.")
        model.reservation_id = payment.reservation.id
        model.amount = payment.amount
        model.method = payment.method
        model.status = payment.status

    def delete(self, payment_id: int) -> None:
        """Retain payment audit history; payments are not deleted."""
        self.get_by_id(payment_id)
        raise ValueError("Payment history is retained; payments cannot be deleted.")

    def transaction(self):
        """Expose an immediate database transaction for payment workflows."""
        return self.database.session_scope()