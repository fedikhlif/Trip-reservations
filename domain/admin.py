"""Administrator domain model."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from domain.destination import Destination
from domain.trip import Trip
from domain.user import User

if TYPE_CHECKING:
    from services.trip_service import TripService


@dataclass
class Admin(User):
    """An administrator who manages trips through TripService."""

    def login(self) -> None:
        """Start a demonstration session without authenticating credentials."""
        self._logged_in = True

    def logout(self) -> None:
        """End the demonstration session."""
        self._logged_in = False

    def add_trip(
        self,
        trip_service: TripService,
        trip_id: int,
        title: str,
        start_date: date,
        end_date: date,
        price: Decimal,
        available_seats: int,
        destination: Destination,
    ) -> Trip:
        """Add a trip using this administrator's permissions."""
        return trip_service.add_trip(
            self,
            trip_id,
            title,
            start_date,
            end_date,
            price,
            available_seats,
            destination,
        )

    def update_trip(
        self, trip_service: TripService, trip_id: int, **changes: object
    ) -> Trip:
        """Update a trip using this administrator's permissions."""
        return trip_service.update_trip(self, trip_id, **changes)

    def delete_trip(self, trip_service: TripService, trip_id: int) -> None:
        """Delete a trip using this administrator's permissions."""
        trip_service.delete_trip(self, trip_id)