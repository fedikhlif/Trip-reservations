"""Shared isolated SQLite fixtures for service and repository tests."""

from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
import tempfile
import unittest

from database import Database
from domain.admin import Admin
from domain.customer import Customer
from domain.destination import Destination
from domain.trip import Trip
from models import Base
from repositories.customer_repository import CustomerRepository
from repositories.destination_repository import DestinationRepository
from repositories.payment_repository import PaymentRepository
from repositories.reservation_repository import ReservationRepository
from repositories.trip_repository import TripRepository
from services.payment_service import PaymentService
from services.reservation_service import ReservationService
from services.trip_service import TripService


class SQLiteTestCase(unittest.TestCase):
    """Give each test a new database file and connected service graph."""

    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_directory.name) / "test.db"
        database_url = f"sqlite+pysqlite:///{self.database_path.as_posix()}"
        self.database = Database(database_url)
        Base.metadata.create_all(self.database.engine)

        self.customer_repository = CustomerRepository(self.database)
        self.destination_repository = DestinationRepository(self.database)
        self.trip_repository = TripRepository(
            self.database, self.destination_repository
        )
        self.reservation_repository = ReservationRepository(
            self.database, self.customer_repository, self.trip_repository
        )
        self.payment_repository = PaymentRepository(
            self.database, self.reservation_repository
        )

        self.customer = Customer(10, "Riley Customer", "riley@example.com", "hash-1")
        self.admin = Admin(11, "Casey Admin", "casey@example.com", "hash-2")
        self.destination = Destination(20, "Kyoto", "Japan", "Historic destination")
        self.trip = Trip(
            30,
            "Kyoto Visit",
            date.today() + timedelta(days=30),
            date.today() + timedelta(days=35),
            Decimal("120.50"),
            2,
            self.destination,
        )
        self.customer_repository.add(self.customer)
        self.customer_repository.add_admin(self.admin)
        self.destination_repository.add(self.destination)
        self.trip_repository.add(self.trip)

        self.trip_service = TripService(
            self.trip_repository, self.customer_repository
        )
        self.reservation_service = ReservationService(
            self.reservation_repository,
            self.customer_repository,
            self.trip_repository,
        )
        self.payment_service = PaymentService(
            self.payment_repository,
            self.reservation_repository,
            self.reservation_service,
        )

    def tearDown(self) -> None:
        self.database.dispose()
        self.temp_directory.cleanup()