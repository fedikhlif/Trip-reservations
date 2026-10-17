"""Tests for SQLAlchemy relationship mappings and enum values."""

from datetime import date, datetime
from decimal import Decimal
import unittest

from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from models import (
    DestinationModel,
    PaymentModel,
    ReservationModel,
    TripModel,
    UserModel,
    UserRole,
)


class ModelRelationshipTests(unittest.TestCase):
    """Verify ORM relationship navigation and ownership rules."""

    def test_relationships_match_domain_relationships(self) -> None:
        customer = UserModel(
            id=1,
            name="Test Customer",
            email="test@example.com",
            password_hash="hash",
            role=UserRole.CUSTOMER,
        )
        destination = DestinationModel(id=2, name="Oslo", country="Norway")
        trip = TripModel(
            id=3,
            title="Oslo Visit",
            start_date=date(2030, 1, 1),
            end_date=date(2030, 1, 3),
            price=Decimal("100.00"),
            available_seats=2,
            destination=destination,
        )
        reservation = ReservationModel(
            id=4,
            customer=customer,
            trip=trip,
            booking_date=datetime(2029, 12, 1, 12, 0),
            status=ReservationStatus.PENDING,
            total_price=Decimal("100.00"),
        )
        payment = PaymentModel(
            id=5,
            reservation=reservation,
            amount=Decimal("100.00"),
            method=PaymentMethod.PAYPAL,
            status=PaymentStatus.PENDING,
        )

        self.assertEqual([trip], destination.trips)
        self.assertIs(destination, trip.destination)
        self.assertEqual([reservation], trip.reservations)
        self.assertIs(customer, reservation.customer)
        self.assertIs(trip, reservation.trip)
        self.assertIs(payment, reservation.payment)
        self.assertEqual([reservation], customer.reservations)