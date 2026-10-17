"""Tests for transactional reservation creation and seat inventory."""

from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from domain.customer import Customer
from domain.enums import ReservationStatus
from models import TripModel
from tests.support import SQLiteTestCase


class ReservationServiceTests(SQLiteTestCase):
    """Each test uses an independent temporary SQLite database."""

    def test_create_reservation_persists_relationships_and_reduces_seats(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        self.assertEqual(1, reservation.id)
        self.assertEqual(ReservationStatus.PENDING, reservation.status)
        self.assertEqual(Decimal("120.50"), reservation.total_price)
        self.assertEqual(1, self.trip_repository.get_by_id(30).available_seats)
        self.assertIn(reservation, self.customer.reservations)
        self.assertIn(reservation, reservation.trip.reservations)
        saved = self.reservation_repository.get_by_id(reservation.id)
        self.assertEqual(self.customer.id, saved.customer.id)
        self.assertEqual(self.trip.id, saved.trip.id)
        self.assertEqual(1, saved.traveler_count)

    def test_group_reservation_calculates_price_and_restores_all_seats(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id, traveler_count=2
        )
        self.assertEqual(2, reservation.traveler_count)
        self.assertEqual(Decimal("241.00"), reservation.total_price)
        self.assertEqual(0, self.trip_repository.get_by_id(30).available_seats)

        self.reservation_service.cancel_reservation(
            reservation.id, self.customer.id
        )
        self.assertEqual(2, self.trip_repository.get_by_id(30).available_seats)

    def test_group_reservation_cannot_overbook_and_rejects_invalid_counts(self) -> None:
        with self.assertRaisesRegex(ValueError, "positive integer"):
            self.reservation_service.create_reservation(
                self.customer, self.trip.id, traveler_count=0
            )
        with self.assertRaisesRegex(ValueError, "positive integer"):
            self.reservation_service.create_reservation(
                self.customer, self.trip.id, traveler_count=1.5
            )
        with self.assertRaisesRegex(ValueError, "no available seats"):
            self.reservation_service.create_reservation(
                self.customer, self.trip.id, traveler_count=3
            )
        self.assertEqual(2, self.trip_repository.get_by_id(30).available_seats)

    def test_rejects_booking_when_no_seats_remain(self) -> None:
        with self.database.session_scope() as session:
            session.execute(
                update(TripModel)
                .where(TripModel.id == self.trip.id)
                .values(available_seats=0)
            )
        with self.assertRaisesRegex(ValueError, "no available seats"):
            self.reservation_service.create_reservation(self.customer, self.trip.id)
        self.assertEqual(0, self.trip_repository.get_by_id(30).available_seats)

    def test_failed_reservation_insert_rolls_back_seat_decrement(self) -> None:
        add_reservation = self.reservation_repository.add

        def fail_add(*args, **kwargs):
            add_reservation(*args, **kwargs)
            raise RuntimeError("simulated insert failure")

        self.reservation_repository.add = fail_add
        with self.assertRaisesRegex(RuntimeError, "simulated"):
            self.reservation_service.create_reservation(self.customer, self.trip.id)
        self.assertEqual(
            2, self.trip_repository.get_by_id(30).available_seats
        )
        self.assertEqual(0, len(self.reservation_repository.get_all()))

    def test_duplicate_active_booking_is_rejected_without_losing_seat(self) -> None:
        self.reservation_service.create_reservation(self.customer, self.trip.id)
        with self.assertRaisesRegex(ValueError, "already has an active reservation"):
            self.reservation_service.create_reservation(
                self.customer, self.trip.id
            )
        self.assertEqual(1, self.trip_repository.get_by_id(30).available_seats)

    def test_concurrent_booking_attempts_cannot_oversell_last_seat(self) -> None:
        with self.database.session_scope() as session:
            session.execute(
                update(TripModel)
                .where(TripModel.id == self.trip.id)
                .values(available_seats=1)
            )
        second_customer = Customer(12, "Dev Customer", "dev@example.com", "hash-3")
        self.customer_repository.add(second_customer)

        def attempt_booking(customer):
            try:
                self.reservation_service.create_reservation(customer, self.trip.id)
                return True
            except ValueError:
                return False

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(
                executor.map(attempt_booking, [self.customer, second_customer])
            )

        self.assertEqual(1, sum(results))
        self.assertEqual(0, self.trip_repository.get_by_id(30).available_seats)
        self.assertEqual(1, len(self.reservation_repository.get_all()))

    def test_cancellation_restores_seat_once_and_retains_history(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        self.reservation_service.cancel_reservation(reservation.id, self.customer.id)
        self.assertEqual(
            2, self.trip_repository.get_by_id(30).available_seats
        )
        with self.assertRaisesRegex(ValueError, "already cancelled"):
            self.reservation_service.cancel_reservation(
                reservation.id, self.customer.id
            )
        self.assertEqual(2, self.trip_repository.get_by_id(30).available_seats)
        self.assertEqual(
            ReservationStatus.CANCELLED,
            self.reservation_repository.get_by_id(reservation.id).status,
        )

    def test_invalid_transitions_and_wrong_owner_are_rejected(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        with self.assertRaises(PermissionError):
            self.reservation_service.cancel_reservation(reservation.id, 99)
        self.reservation_service.confirm_reservation(reservation.id)
        with self.assertRaisesRegex(ValueError, "Only pending"):
            self.reservation_service.confirm_reservation(reservation.id)
        self.reservation_service.cancel_reservation(reservation.id, self.customer.id)

    def test_unknown_customer_trip_and_reservation_ids_are_reported(self) -> None:
        with self.assertRaisesRegex(KeyError, "Customer 99 was not found"):
            self.reservation_service.get_customer_reservations(99)
        with self.assertRaisesRegex(KeyError, "Trip 99 was not found"):
            self.reservation_service.create_reservation(self.customer, 99)
        with self.assertRaisesRegex(KeyError, "Reservation 99 was not found"):
            self.reservation_service.cancel_reservation(99)

    def test_user_foreign_key_restricts_customer_deletion(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        with self.assertRaises(IntegrityError):
            self.customer_repository.delete(self.customer.id)
        self.assertIsNotNone(self.reservation_repository.get_by_id(reservation.id))


if __name__ == "__main__":
    import unittest

    unittest.main()