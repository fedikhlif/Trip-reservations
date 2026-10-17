"""Integration tests for ORM metadata, constraints, and persistence."""

from datetime import date, datetime, timedelta
from decimal import Decimal
import os
from pathlib import Path
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from database import Database, database_url_from_environment
from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from models import Base, DestinationModel, ReservationModel, TripModel
from tests.support import SQLiteTestCase


class DatabaseTests(SQLiteTestCase):
    """Check model metadata and conversions on isolated SQLite databases."""

    def test_schema_tables_and_foreign_keys_are_initialized(self) -> None:
        self.assertEqual(
            {"users", "destinations", "trips", "reservations", "payments"},
            set(inspect(self.database.engine).get_table_names()),
        )
        with self.database.session_scope() as session:
            self.assertEqual(1, session.scalar(text("PRAGMA foreign_keys")))

    def test_alembic_migration_applies_to_isolated_test_database(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        migration_path = self.database_path.parent / "migration.db"
        url = f"sqlite+pysqlite:///{migration_path.as_posix()}"
        previous_url = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = url
        try:
            command.upgrade(Config(str(project_root / "alembic.ini")), "head")
        finally:
            if previous_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_url
        migrated_database = Database(url)
        try:
            self.assertEqual(
                {
                    "users",
                    "destinations",
                    "trips",
                    "reservations",
                    "payments",
                    "alembic_version",
                },
                set(inspect(migrated_database.engine).get_table_names()),
            )
        finally:
            migrated_database.dispose()

    def test_traveler_migration_preserves_existing_reservations(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        migration_path = self.database_path.parent / "existing_reservation.db"
        url = f"sqlite+pysqlite:///{migration_path.as_posix()}"
        previous_url = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = url
        config = Config(str(project_root / "alembic.ini"))
        try:
            command.upgrade(config, "1d1eef57ca4d")
            old_database = Database(url)
            try:
                with old_database.engine.begin() as connection:
                    connection.execute(text(
                        "INSERT INTO users (id, name, email, password_hash, role) "
                        "VALUES (1, 'Demo Customer', 'demo@example.test', 'hash', 'customer')"
                    ))
                    connection.execute(text(
                        "INSERT INTO destinations (id, name, country, description) "
                        "VALUES (1, 'Kyoto', 'Japan', 'Historic city')"
                    ))
                    connection.execute(text(
                        "INSERT INTO trips (id, title, destination_id, start_date, "
                        "end_date, price, available_seats) VALUES "
                        "(1, 'Kyoto visit', 1, '2026-11-10', '2026-11-15', 100.00, 4)"
                    ))
                    connection.execute(text(
                        "INSERT INTO reservations (id, customer_id, trip_id, booking_date, "
                        "status, total_price) VALUES "
                        "(1, 1, 1, '2026-10-17 12:00:00', 'PENDING', 100.00)"
                    ))
            finally:
                old_database.dispose()

            command.upgrade(config, "head")
            migrated_database = Database(url)
            try:
                with migrated_database.session_scope() as session:
                    self.assertEqual(
                        1,
                        session.scalar(text(
                            "SELECT traveler_count FROM reservations WHERE id = 1"
                        )),
                    )
            finally:
                migrated_database.dispose()
        finally:
            if previous_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_url

    def test_mysql_url_uses_environment_values_without_exposing_password(
        self,
    ) -> None:
        settings = {
            "DB_HOST": "db.example.test",
            "DB_PORT": "3307",
            "DB_NAME": "reservations_test",
            "DB_USER": "test_user",
            "DB_PASSWORD": "test-secret-value",
            "DATABASE_URL": "",
        }
        with patch.dict(os.environ, settings):
            url = database_url_from_environment()
        self.assertEqual("mysql+pymysql", url.drivername)
        self.assertEqual("db.example.test", url.host)
        self.assertEqual(3307, url.port)
        self.assertEqual("reservations_test", url.database)
        self.assertEqual("test_user", url.username)
        self.assertEqual("test-secret-value", url.password)
        self.assertNotIn("test-secret-value", url.render_as_string())

    def test_application_does_not_create_schema_automatically(self) -> None:
        from main import build_application

        empty_path = self.database_path.parent / "no_auto_create.db"
        empty_database = Database(
            f"sqlite+pysqlite:///{empty_path.as_posix()}"
        )
        try:
            with self.assertRaisesRegex(Exception, "no such table: users"):
                build_application(empty_database)
            self.assertEqual([], inspect(empty_database.engine).get_table_names())
        finally:
            empty_database.dispose()

    def test_application_uses_an_existing_migrated_schema_and_seeds_once(self) -> None:
        from main import build_application

        path = self.database_path.parent / "application.db"
        application_database = Database(
            f"sqlite+pysqlite:///{path.as_posix()}"
        )
        Base.metadata.create_all(application_database.engine)
        try:
            first = build_application(application_database)
            second = build_application(application_database)
            self.assertEqual(2, len(first[2].list_all_trips()))
            self.assertEqual(2, len(second[2].list_all_trips()))
            self.assertEqual(1, len(first[3].customer_repository.get_all()))
            self.assertEqual(1, len(second[3].customer_repository.get_all()))
        finally:
            application_database.dispose()

    def test_primary_key_unique_email_and_foreign_key_constraints(self) -> None:
        from domain.customer import Customer

        with self.assertRaises(IntegrityError):
            self.customer_repository.add(
                Customer(99, "Duplicate Email", self.customer.email, "hash")
            )
        with self.assertRaises(IntegrityError):
            self.customer_repository.add(
                Customer(self.customer.id, "Duplicate ID", "other@example.com", "hash")
            )
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.add(
                    TripModel(
                        title="Bad FK",
                        destination_id=404,
                        start_date=date(2030, 1, 1),
                        end_date=date(2030, 1, 2),
                        price=Decimal("1.00"),
                        available_seats=1,
                    )
                )
                session.flush()
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                session.add(
                    ReservationModel(
                        customer_id=404,
                        trip_id=self.trip.id,
                        booking_date=datetime.now(),
                        status=ReservationStatus.PENDING,
                        total_price=Decimal("1.00"),
                    )
                )
                session.flush()

    def test_each_repository_round_trips_its_entity_and_relationships(self) -> None:
        customer = self.customer_repository.get_by_id(self.customer.id)
        admin = self.customer_repository.get_user_by_id(self.admin.id)
        destination = self.destination_repository.get_by_id(self.destination.id)
        trip = self.trip_repository.get_by_id(self.trip.id)
        reservation = self.reservation_service.create_reservation(customer, trip.id)
        payment = self.payment_service.process_payment(
            reservation.id, reservation.total_price, PaymentMethod.PAYPAL
        )

        self.assertEqual("Customer", type(customer).__name__)
        self.assertEqual("Admin", type(admin).__name__)
        self.assertEqual(self.destination, destination)
        self.assertEqual(Decimal("120.50"), trip.price)
        saved_reservation = self.reservation_repository.get_by_id(reservation.id)
        saved_payment = self.payment_repository.get_by_id(payment.id)
        self.assertEqual(customer.id, saved_reservation.customer.id)
        self.assertEqual(trip.id, saved_reservation.trip.id)
        self.assertEqual(reservation.id, saved_payment.reservation.id)
        self.assertEqual(PaymentMethod.PAYPAL, saved_payment.method)

    def test_data_persists_after_reopening_database(self) -> None:
        reservation = self.reservation_service.create_reservation(
            self.customer, self.trip.id
        )
        payment = self.payment_service.process_payment(
            reservation.id, reservation.total_price, PaymentMethod.CREDIT_CARD
        )
        path = self.database_path
        reopened = Database(f"sqlite+pysqlite:///{path.as_posix()}")
        customers = type(self.customer_repository)(reopened)
        destinations = type(self.destination_repository)(reopened)
        trips = type(self.trip_repository)(reopened, destinations)
        reservations = type(self.reservation_repository)(reopened, customers, trips)
        payments = type(self.payment_repository)(reopened, reservations)

        loaded = reservations.get_by_id(reservation.id)
        self.assertEqual(self.customer.id, loaded.customer.id)
        self.assertEqual(Decimal("120.50"), loaded.total_price)
        self.assertEqual(ReservationStatus.CONFIRMED, loaded.status)
        self.assertEqual(1, trips.get_by_id(self.trip.id).available_seats)
        loaded_payment = payments.get_by_id(payment.id)
        self.assertEqual(PaymentStatus.COMPLETED, loaded_payment.status)
        self.assertEqual(reservation.id, loaded_payment.reservation.id)
        reopened.dispose()

    def test_domain_and_database_reject_invalid_dates_and_negative_values(self) -> None:
        with self.assertRaises(ValueError):
            self.trip.update_details(end_date=self.trip.start_date - timedelta(days=1))
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                model = session.get(TripModel, self.trip.id)
                model.price = Decimal("-1.00")
                session.flush()
        with self.assertRaises(IntegrityError):
            with self.database.session_scope() as session:
                model = session.get(TripModel, self.trip.id)
                model.available_seats = -1
                session.flush()


if __name__ == "__main__":
    import unittest

    unittest.main()