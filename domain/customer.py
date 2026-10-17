"""Customer domain model."""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from domain.user import User

if TYPE_CHECKING:
    from domain.reservation import Reservation


@dataclass
class Customer(User):
    """A customer who can search trips and manage reservations."""

    reservations: list["Reservation"] = field(default_factory=list, repr=False)

    def login(self) -> None:
        """Start a demonstration session without authenticating credentials."""
        self._logged_in = True

    def logout(self) -> None:
        """End the demonstration session."""
        self._logged_in = False

    def search_trips(
        self,
        trip_service: "TripService",
        destination: str | None = None,
        on_date: date | None = None,
        max_price: Decimal | None = None,
    ) -> list["Trip"]:
        """Search available trips through the service layer."""
        return trip_service.search_trips(destination, on_date, max_price)

    def make_reservation(
        self,
        reservation_service: "ReservationService",
        trip_id: int,
        traveler_count: int = 1,
    ) -> "Reservation":
        """Create a reservation through the service layer."""
        return reservation_service.create_reservation(
            self, trip_id, traveler_count
        )

    def view_reservations(
        self, reservation_service: "ReservationService"
    ) -> list["Reservation"]:
        """Return this customer's reservations."""
        return reservation_service.get_customer_reservations(self.id)

    def cancel_reservation(
        self, reservation_service: "ReservationService", reservation_id: int
    ) -> "Reservation":
        """Cancel one of this customer's reservations."""
        return reservation_service.cancel_reservation(reservation_id, self.id)


if TYPE_CHECKING:
    from domain.trip import Trip
    from services.reservation_service import ReservationService
    from services.trip_service import TripService