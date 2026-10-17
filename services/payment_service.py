"""Simulated payment processing and refunds."""

from decimal import Decimal

from sqlalchemy.orm import Session

from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from domain.payment import Payment
from repositories.payment_repository import PaymentRepository
from repositories.reservation_repository import ReservationRepository
from services.reservation_service import ReservationService


class PaymentService:
    """Coordinate simulated payments and reservation state changes."""

    def __init__(
        self,
        payment_repository: PaymentRepository,
        reservation_repository: ReservationRepository,
        reservation_service: ReservationService,
    ) -> None:
        self.payment_repository = payment_repository
        self.reservation_repository = reservation_repository
        self.reservation_service = reservation_service

    def process_payment(
        self,
        reservation_id: int,
        amount: Decimal,
        method: PaymentMethod,
        succeed: bool = True,
        customer_id: int | None = None,
    ) -> Payment:
        """Record one simulated attempt and update statuses in one transaction."""
        with self.payment_repository.transaction() as connection:
            reservation = self.reservation_repository.get_by_id(
                reservation_id, connection, for_update=True
            )
            if (
                customer_id is not None
                and reservation.customer.id != customer_id
            ):
                raise PermissionError(
                    "This reservation belongs to another customer."
                )
            if reservation.status not in (
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
            ):
                raise ValueError("Payment is only allowed for an active reservation.")
            if self.payment_repository.get_by_reservation_id(
                reservation_id, connection
            ) is not None:
                raise ValueError("A payment already exists for this reservation.")

            normalized_amount = Decimal(str(amount))
            if normalized_amount != reservation.total_price:
                raise ValueError("Payment amount must match the reservation total.")

            payment = Payment(0, reservation, normalized_amount, method)
            if succeed:
                payment.process_payment()
                if reservation.status is ReservationStatus.PENDING:
                    reservation.confirm()
                self.reservation_repository.update(reservation, connection)
            else:
                payment.fail()
            self.payment_repository.add(payment, connection)
        return payment

    def refund_payment(
        self, payment_id: int, customer_id: int | None = None
    ) -> Payment:
        """Refund a completed payment and cancel its reservation."""
        with self.payment_repository.transaction() as connection:
            payment = self.payment_repository.get_by_id(
                payment_id, connection, for_update=True
            )
            if (
                customer_id is not None
                and payment.reservation.customer.id != customer_id
            ):
                raise PermissionError(
                    "This payment belongs to another customer."
                )
            if payment.status is not PaymentStatus.COMPLETED:
                raise ValueError("Only completed payments can be refunded.")
            if payment.reservation.status is not ReservationStatus.CONFIRMED:
                raise ValueError("Only an active reservation can be refunded.")
            payment.refund()
            self.payment_repository.update(payment, connection)
            reservation = self.reservation_service.cancel_reservation(
                payment.reservation.id,
                payment.reservation.customer.id,
                connection,
            )
            payment.reservation = reservation
        return payment