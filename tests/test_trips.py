"""Tests for SQLite-backed trip storage, search, and administration."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from domain.trip import Trip
from models import TripModel
from tests.support import SQLiteTestCase


class TripServiceTests(SQLiteTestCase):
    """Exercise trip queries, persistence, and constraints."""

    def test_search_by_destination_date_and_price(self) -> None:
        results = self.trip_service.search_trips(
            "japan",
            self.trip.start_date + timedelta(days=1),
            Decimal("121.00"),
        )
        self.assertEqual([30], [trip.id for trip in results])
        self.assertEqual([], self.trip_service.search_trips(max_price=Decimal("100")))

    def test_search_input_is_parameterized(self) -> None:
        results = self.trip_service.search_trips("%' OR 1=1 --")
        self.assertEqual([], results)
        self.assertEqual(1, len(self.trip_repository.get_all()))

    def test_search_filters_destination_date_window_and_group_capacity(self) -> None:
        results = self.trip_service.search_trips(
            destination_id=self.destination.id,
            departure_date=self.trip.start_date,
            return_date=self.trip.end_date,
            travelers=2,
        )
        self.assertEqual([self.trip.id], [trip.id for trip in results])
        self.assertEqual(
            [],
            self.trip_service.search_trips(
                destination_id=self.destination.id,
                departure_date=self.trip.start_date,
                return_date=self.trip.end_date,
                travelers=3,
            ),
        )

    def test_search_rejects_invalid_date_window_and_traveler_count(self) -> None:
        with self.assertRaisesRegex(ValueError, "Return date"):
            self.trip_service.search_trips(
                departure_date=self.trip.end_date,
                return_date=self.trip.start_date,
            )
        with self.assertRaisesRegex(ValueError, "at least one"):
            self.trip_service.search_trips(travelers=0)

    def test_trip_round_trip_and_admin_update(self) -> None:
        stored = self.trip_repository.get_by_id(self.trip.id)
        self.assertEqual(Decimal("120.50"), stored.price)
        self.trip_service.update_trip(self.admin, stored.id, title="Kyoto Autumn")
        self.assertEqual("Kyoto Autumn", self.trip_repository.get_by_id(30).title)

    def test_admin_can_add_and_delete_unreferenced_trip(self) -> None:
        added = self.trip_service.add_trip(
            self.admin,
            31,
            "Kyoto Winter",
            self.trip.start_date,
            self.trip.end_date,
            Decimal("200.00"),
            3,
            self.destination,
        )
        self.assertEqual(31, self.trip_repository.get_by_id(added.id).id)
        self.trip_service.delete_trip(self.admin, added.id)
        with self.assertRaisesRegex(KeyError, "Trip 31 was not found"):
            self.trip_repository.get_by_id(31)

    def test_non_admin_cannot_manage_trips(self) -> None:
        with self.assertRaises(PermissionError):
            self.trip_service.delete_trip(
                object(), self.trip.id
            )  # type: ignore[arg-type]
        with self.assertRaisesRegex(PermissionError, "not stored"):
            self.trip_service.delete_trip(
                type(self.admin)(
                    99, "Unstored", "nobody@example.com", "hash"
                ),
                self.trip.id,
            )

    def test_unknown_trip_and_destination_ids_are_reported(self) -> None:
        with self.assertRaisesRegex(KeyError, "Trip 404 was not found"):
            self.trip_repository.get_by_id(404)
        with self.assertRaisesRegex(KeyError, "Destination 404 was not found"):
            self.destination_repository.get_by_id(404)

    def test_database_rejects_negative_price_and_seats(self) -> None:
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.execute(
                    update(TripModel)
                    .where(TripModel.id == self.trip.id)
                    .values(price=Decimal("-1.00"))
                )
                session.flush()
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.execute(
                    update(TripModel)
                    .where(TripModel.id == self.trip.id)
                    .values(available_seats=-1)
                )
                session.flush()

    def test_trip_and_destination_cannot_be_deleted_when_referenced(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        with self.assertRaises(IntegrityError):
            self.trip_repository.delete(self.trip.id)
        with self.assertRaises(IntegrityError):
            self.destination_repository.delete(self.destination.id)
        self.assertIsNotNone(
            self.reservation_repository.get_by_id(reservation.id)
        )


if __name__ == "__main__":
    import unittest

    unittest.main()