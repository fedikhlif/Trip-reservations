"""Trip domain model."""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from domain.destination import Destination

if TYPE_CHECKING:
    from domain.reservation import Reservation


@dataclass
class Trip:
    """A bookable trip to one destination."""

    id: int
    title: str
    start_date: date
    end_date: date
    price: Decimal
    available_seats: int
    destination: Destination
    reservations: list["Reservation"] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        """Normalize monetary values and validate initial details."""
        self.price = Decimal(str(self.price))
        if self.price < 0:
            raise ValueError("Trip price cannot be negative.")
        if self.available_seats < 0:
            raise ValueError("Available seats cannot be negative.")
        if self.end_date < self.start_date:
            raise ValueError("Trip end date cannot be before its start date.")

    def is_available(self) -> bool:
        """Return whether at least one seat can be booked."""
        return self.available_seats > 0

    def update_details(self, **changes: object) -> None:
        """Update supported trip details after validating the resulting trip."""
        allowed = {
            "title",
            "start_date",
            "end_date",
            "price",
            "available_seats",
            "destination",
        }
        unknown = set(changes) - allowed
        if unknown:
            fields = ", ".join(sorted(unknown))
            raise ValueError(f"Unsupported trip field(s): {fields}.")

        updated = {
            "title": self.title,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "price": self.price,
            "available_seats": self.available_seats,
            "destination": self.destination,
        }
        updated.update(changes)
        updated["price"] = Decimal(str(updated["price"]))

        if updated["price"] < 0:
            raise ValueError("Trip price cannot be negative.")
        if updated["available_seats"] < 0:
            raise ValueError("Available seats cannot be negative.")
        if updated["end_date"] < updated["start_date"]:
            raise ValueError("Trip end date cannot be before its start date.")
        if not isinstance(updated["destination"], Destination):
            raise TypeError("Destination must be a Destination object.")

        for field_name, value in updated.items():
            setattr(self, field_name, value)