"""Tests for explicit legacy SQLite transfer into ORM-backed storage."""

from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
import sqlite3
import tempfile
import unittest

from database import Database
from domain.enums import PaymentMethod, PaymentStatus
from models import Base
from repositories.customer_repository import CustomerRepository
from repositories.destination_repository import DestinationRepository
from repositories.payment_repository import PaymentRepository
from repositories.reservation_repository import ReservationRepository
from repositories.trip_repository import TripRepository
from scripts.import_sqlite_to_mysql import import_legacy_sqlite


class LegacyImportTests(unittest.TestCase):
    """Verify table order, ID preservation, linkage, and non-destructive refusal."""

    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.source_path = self.root / "legacy.db"
        connection = sqlite3.connect(self.source_path)
        connection.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY, name TEXT, email TEXT,
                password_hash TEXT, role TEXT
            );
            CREATE TABLE destinations (
                id INTEGER PRIMARY KEY, name TEXT, country TEXT, description TEXT
            );
            CREATE TABLE trips (
                id INTEGER PRIMARY KEY, title TEXT, destination_id INTEGER,
                start_date TEXT, end_date TEXT, price_cents INTEGER,
                available_seats INTEGER
            );
            CREATE TABLE reservations (
                id INTEGER PRIMARY KEY, customer_id INTEGER, trip_id INTEGER,
                booking_date TEXT, status TEXT, total_price_cents INTEGER
            );
            CREATE TABLE payments (
                id INTEGER PRIMARY KEY, reservation_id INTEGER,
                amount_cents INTEGER, method TEXT, status TEXT
            );
            INSERT INTO users VALUES (
                12, 'Legacy Customer', 'legacy@example.com', 'hash', 'customer'
            );
            INSERT INTO destinations VALUES (22, 'Lima', 'Peru', 'Old city');
            INSERT INTO trips VALUES (
                32, 'Lima Tour', 22, '2031-02-01', '2031-02-03', 9875, 3
            );
            INSERT INTO reservations VALUES (
                42, 12, 32, '2031-01-01T10:30:00', 'CONFIRMED', 9875
            );
            INSERT INTO payments VALUES (52, 42, 9875, 'PAYPAL', 'COMPLETED');
            """
        )
        connection.commit()
        connection.close()

        self.target_url = f"sqlite+pysqlite:///{(self.root / 'target.db').as_posix()}"
        self.database = Database(self.target_url)
        Base.metadata.create_all(self.database.engine)

    def tearDown(self) -> None:
        self.database.dispose()
        self.directory.cleanup()

    def test_import_preserves_records_and_relationships(self) -> None:
        counts = import_legacy_sqlite(self.source_path, self.database)
        self.assertEqual(
            {
                "users": 1,
                "destinations": 1,
                "trips": 1,
                "reservations": 1,
                "payments": 1,
            },
            counts,
        )
        customers = CustomerRepository(self.database)
        destinations = DestinationRepository(self.database)
        trips = TripRepository(self.database, destinations)
        reservations = ReservationRepository(
            self.database, customers, trips
        )
        payments = PaymentRepository(self.database, reservations)

        reservation = reservations.get_by_id(42)
        payment = payments.get_by_id(52)
        self.assertEqual(12, reservation.customer.id)
        self.assertEqual(32, reservation.trip.id)
        self.assertEqual(Decimal("98.75"), reservation.total_price)
        self.assertEqual(date(2031, 2, 1), reservation.trip.start_date)
        self.assertEqual(datetime(2031, 1, 1, 10, 30), reservation.booking_date)
        self.assertEqual(PaymentMethod.PAYPAL, payment.method)
        self.assertEqual(PaymentStatus.COMPLETED, payment.status)
        self.assertEqual(42, payment.reservation.id)

    def test_import_refuses_nonempty_target_without_overwriting(self) -> None:
        import_legacy_sqlite(self.source_path, self.database)
        with self.assertRaisesRegex(ValueError, "empty target"):
            import_legacy_sqlite(self.source_path, self.database)


if __name__ == "__main__":
    unittest.main()