"""Trip operations and trip search criteria."""

from datetime import date
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from domain.admin import Admin
from domain.destination import Destination
from domain.trip import Trip
from repositories.customer_repository import CustomerRepository
from repositories.trip_repository import TripRepository


class TripService:
    """Coordinate trip workflows through TripRepository."""

    def __init__(
        self,
        trip_repository: TripRepository,
        user_repository: CustomerRepository | None = None,
    ) -> None:
        self.trip_repository = trip_repository
        self.user_repository = user_repository or CustomerRepository(
            trip_repository.database
        )

    def list_available_trips(self) -> list[Trip]:
        """Return trips with at least one available seat."""
        return [trip for trip in self.trip_repository.get_all() if trip.is_available()]

    def list_all_trips(self) -> list[Trip]:
        """Return all trips, including trips that are fully booked."""
        return self.trip_repository.get_all()

    def search_trips(
        self,
        destination: str | None = None,
        on_date: date | None = None,
        max_price: Decimal | None = None,
        destination_id: int | None = None,
        departure_date: date | None = None,
        return_date: date | None = None,
        travelers: int = 1,
    ) -> list[Trip]:
        """Search available trips by destination, date range, capacity, and price."""
        if max_price is not None:
            normalized_price = Decimal(str(max_price))
            if not normalized_price.is_finite() or normalized_price < 0:
                raise ValueError("Maximum price must be a finite, non-negative amount.")
        if destination_id is not None and destination_id < 1:
            raise ValueError("Destination ID must be a positive integer.")
        return self.trip_repository.search_available(
            destination,
            on_date,
            max_price,
            destination_id,
            departure_date,
            return_date,
            travelers,
        )

    def add_trip(
        self,
        admin: Admin,
        trip_id: int,
        title: str,
        start_date: date,
        end_date: date,
        price: Decimal,
        available_seats: int,
        destination: Destination,
    ) -> Trip:
        """Create a trip, requiring an Admin caller."""
        self._require_admin(admin)
        trip = Trip(
            trip_id,
            title,
            start_date,
            end_date,
            Decimal(str(price)),
            available_seats,
            destination,
        )
        self.trip_repository.add(trip)
        return trip

    def update_trip(self, admin: Admin, trip_id: int, **changes: object) -> Trip:
        """Update an existing trip, requiring an Admin caller."""
        self._require_admin(admin)
        trip = self.trip_repository.get_by_id(trip_id)
        trip.update_details(**changes)
        self.trip_repository.update(trip)
        return trip

    def delete_trip(self, admin: Admin, trip_id: int) -> None:
        """Delete an existing trip, requiring an Admin caller."""
        self._require_admin(admin)
        self.trip_repository.get_by_id(trip_id)
        try:
            self.trip_repository.delete(trip_id)
        except IntegrityError as error:
            raise ValueError(
                "A trip with reservation history cannot be deleted."
            ) from error

    def _require_admin(self, admin: Admin) -> None:
        """Reject trip-management calls from non-administrators."""
        if not isinstance(admin, Admin):
            raise PermissionError("Only an administrator can manage trips.")
        try:
            stored_user = self.user_repository.get_user_by_id(admin.id)
        except KeyError as error:
            raise PermissionError(
                "Administrator is not stored in this system."
            ) from error
        if not isinstance(stored_user, Admin):
            raise PermissionError("Only an administrator can manage trips.")