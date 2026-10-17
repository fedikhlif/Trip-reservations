"""Tests for SQLite-backed simulated payments and refunds."""

from decimal import Decimal

from sqlalchemy.exc import IntegrityError

from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from models import PaymentModel
from tests.support import SQLiteTestCase


class PaymentServiceTests(SQLiteTestCase):
    """Test payment outcomes and database-enforced state invariants."""

    def setUp(self) -> None:
        super().setUp()
        self.reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )

    def test_successful_payment_is_persisted_and_confirms_reservation(self) -> None:
        payment = self.payment_service.process_payment(
            self.reservation.id,
            Decimal("120.50"),
            PaymentMethod.CREDIT_CARD,
        )
        self.assertEqual(PaymentStatus.COMPLETED, payment.status)
        self.assertEqual(
            ReservationStatus.CONFIRMED,
            self.reservation_repository.get_by_id(self.reservation.id).status,
        )
        loaded = self.payment_repository.get_by_id(payment.id)
        self.assertEqual(Decimal("120.50"), loaded.amount)

    def test_failed_attempt_does_not_confirm_reservation(self) -> None:
        payment = self.payment_service.process_payment(
            self.reservation.id,
            self.reservation.total_price,
            PaymentMethod.PAYPAL,
            succeed=False,
        )
        self.assertEqual(PaymentStatus.FAILED, payment.status)
        self.assertEqual(
            ReservationStatus.PENDING,
            self.reservation_repository.get_by_id(self.reservation.id).status,
        )
        with self.assertRaisesRegex(ValueError, "Only pending payments"):
            payment.process_payment()
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.payment_service.process_payment(
                self.reservation.id,
                self.reservation.total_price,
                PaymentMethod.PAYPAL,
            )
        with self.assertRaisesRegex(ValueError, "Only completed payments"):
            self.payment_service.refund_payment(payment.id)

    def test_payment_must_match_reservation_total(self) -> None:
        with self.assertRaisesRegex(ValueError, "must match"):
            self.payment_service.process_payment(
                self.reservation.id, Decimal("119.99"), PaymentMethod.PAYPAL
            )

    def test_duplicate_payment_is_rejected(self) -> None:
        payment = self.payment_service.process_payment(
            self.reservation.id,
            self.reservation.total_price,
            PaymentMethod.PAYPAL,
        )
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.payment_service.process_payment(
                self.reservation.id,
                self.reservation.total_price,
                PaymentMethod.CREDIT_CARD,
            )
        self.assertEqual(1, len(self.payment_repository.get_all()))
        self.assertEqual(PaymentStatus.COMPLETED, payment.status)

    def test_refund_cancels_reservation_and_restores_one_seat(self) -> None:
        payment = self.payment_service.process_payment(
            self.reservation.id,
            self.reservation.total_price,
            PaymentMethod.BANK_TRANSFER,
        )
        payment = self.payment_service.refund_payment(payment.id)
        self.assertEqual(PaymentStatus.REFUNDED, payment.status)
        self.assertEqual(
            ReservationStatus.CANCELLED,
            self.reservation_repository.get_by_id(self.reservation.id).status,
        )
        self.assertEqual(2, self.trip_repository.get_by_id(30).available_seats)
        with self.assertRaisesRegex(ValueError, "Only completed payments"):
            self.payment_service.refund_payment(payment.id)
        self.assertEqual(2, self.trip_repository.get_by_id(30).available_seats)

    def test_refund_failure_rolls_back_payment_reservation_and_inventory(self) -> None:
        payment = self.payment_service.process_payment(
            self.reservation.id,
            self.reservation.total_price,
            PaymentMethod.CREDIT_CARD,
        )

        def fail_cancellation(*args, **kwargs):
            raise RuntimeError("simulated cancellation failure")

        self.reservation_service.cancel_reservation = fail_cancellation
        with self.assertRaisesRegex(RuntimeError, "simulated"):
            self.payment_service.refund_payment(payment.id)

        persisted_payment = self.payment_repository.get_by_id(payment.id)
        persisted_reservation = self.reservation_repository.get_by_id(
            self.reservation.id
        )
        self.assertEqual(PaymentStatus.COMPLETED, persisted_payment.status)
        self.assertEqual(ReservationStatus.CONFIRMED, persisted_reservation.status)
        self.assertEqual(1, self.trip_repository.get_by_id(30).available_seats)

    def test_negative_amount_and_duplicate_payment_are_rejected_by_database(
        self,
    ) -> None:
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.add(
                    PaymentModel(
                        reservation_id=self.reservation.id,
                        amount=Decimal("-1.00"),
                        method=PaymentMethod.PAYPAL,
                        status=PaymentStatus.PENDING,
                    )
                )
                session.flush()
        payment = self.payment_service.process_payment(
            self.reservation.id,
            self.reservation.total_price,
            PaymentMethod.PAYPAL,
        )
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.add(
                    PaymentModel(
                        reservation_id=self.reservation.id,
                        amount=payment.amount,
                        method=PaymentMethod.PAYPAL,
                        status=PaymentStatus.COMPLETED,
                    )
                )
                session.flush()
        with self.assertRaisesRegex(ValueError, "payments cannot be deleted"):
            self.payment_repository.delete(payment.id)

    def test_unknown_reservation_and_payment_ids_are_reported(self) -> None:
        with self.assertRaisesRegex(KeyError, "Reservation 404 was not found"):
            self.payment_service.process_payment(
                404, Decimal("1"), PaymentMethod.PAYPAL
            )
        with self.assertRaisesRegex(KeyError, "Payment 404 was not found"):
            self.payment_service.refund_payment(404)
        with self.assertRaisesRegex(KeyError, "Payment 404 was not found"):
            self.payment_repository.get_by_id(404)


if __name__ == "__main__":
    import unittest

    unittest.main()