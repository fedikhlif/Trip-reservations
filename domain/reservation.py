"""Reservation domain model."""

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from domain.enums import ReservationStatus

if TYPE_CHECKING:
    from domain.customer import Customer
    from domain.payment import Payment
    from domain.trip import Trip


@dataclass
class Reservation:
    """A single customer's booking for one seat on a trip."""

    id: int
    customer: "Customer"
    trip: "Trip"
    booking_date: datetime = field(default_factory=datetime.now)
    status: ReservationStatus = ReservationStatus.PENDING
    total_price: Decimal = Decimal("0.00")
    payment: "Payment | None" = None
    traveler_count: int = 1

    def __post_init__(self) -> None:
        """Normalize the amount stored on this reservation."""
        self.total_price = Decimal(str(self.total_price))
        if self.total_price < 0:
            raise ValueError("Reservation total cannot be negative.")
        if (
            isinstance(self.traveler_count, bool)
            or not isinstance(self.traveler_count, int)
            or self.traveler_count < 1
        ):
            raise ValueError("Traveler count must be a positive integer.")

    def confirm(self) -> None:
        """Confirm a pending reservation."""
        if self.status is not ReservationStatus.PENDING:
            raise ValueError("Only pending reservations can be confirmed.")
        self.status = ReservationStatus.CONFIRMED

    def cancel(self) -> None:
        """Cancel a pending or confirmed reservation."""
        if self.status is ReservationStatus.CANCELLED:
            raise ValueError("Reservation is already cancelled.")
        self.status = ReservationStatus.CANCELLED

    def calculate_price(self) -> Decimal:
        """Return the price for this one-seat reservation."""
        return self.trip.price