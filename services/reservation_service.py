"""Reservation workflows and seat inventory management."""

from decimal import Decimal

from sqlalchemy.orm import Session

from domain.customer import Customer
from domain.enums import PaymentStatus, ReservationStatus
from domain.reservation import Reservation
from repositories.customer_repository import CustomerRepository
from repositories.reservation_repository import ReservationRepository
from repositories.trip_repository import TripRepository


class ReservationConflictError(ValueError):
    """A valid booking request conflicts with current inventory or booking state."""


class ReservationService:
    """Coordinate reservations, customer links, and trip seat counts."""

    def __init__(
        self,
        reservation_repository: ReservationRepository,
        customer_repository: CustomerRepository,
        trip_repository: TripRepository,
    ) -> None:
        self.reservation_repository = reservation_repository
        self.customer_repository = customer_repository
        self.trip_repository = trip_repository

    def create_reservation(
        self, customer: Customer, trip_id: int, traveler_count: int = 1
    ) -> Reservation:
        """Reserve seats with inventory and reservation committed together."""
        if (
            isinstance(traveler_count, bool)
            or not isinstance(traveler_count, int)
            or traveler_count < 1
        ):
            raise ValueError("Traveler count must be a positive integer.")
        with self.reservation_repository.transaction() as connection:
            self.customer_repository.get_by_id(customer.id, connection)
            trip = self.trip_repository.get_by_id(trip_id, connection, for_update=True)
            if not self.trip_repository.reserve_seats(
                trip_id, traveler_count, connection
            ):
                raise ReservationConflictError(
                    "This trip has no available seats for the requested group."
                )
            if self.reservation_repository.has_active_for_trip(
                customer.id, trip_id, connection
            ):
                raise ReservationConflictError(
                    "This customer already has an active reservation for the trip."
                )
            reservation = Reservation(
                0,
                customer,
                trip,
                total_price=Decimal(str(trip.price)) * traveler_count,
                traveler_count=traveler_count,
            )
            self.reservation_repository.add(reservation, connection)
        trip.available_seats -= traveler_count
        customer.reservations.append(reservation)
        trip.reservations.append(reservation)
        return reservation

    def confirm_reservation(self, reservation_id: int) -> Reservation:
        """Confirm a pending reservation."""
        with self.reservation_repository.transaction() as connection:
            reservation = self.reservation_repository.get_by_id(
                reservation_id, connection, for_update=True
            )
            reservation.confirm()
            self.reservation_repository.update(reservation, connection)
        return reservation

    def cancel_reservation(
        self,
        reservation_id: int,
        customer_id: int | None = None,
        connection: Session | None = None,
    ) -> Reservation:
        """Cancel a reservation and return its seat to the trip."""
        if connection is None:
            with self.reservation_repository.transaction() as connection:
                reservation = self.cancel_reservation(
                    reservation_id, customer_id, connection
                )
            return reservation
        reservation = self.reservation_repository.get_by_id(
            reservation_id, connection, for_update=True
        )
        if customer_id is not None and reservation.customer.id != customer_id:
            raise PermissionError("This reservation belongs to another customer.")
        if (
            reservation.payment is not None
            and reservation.payment.status is PaymentStatus.COMPLETED
        ):
            raise ValueError("Refund the completed payment before cancelling.")
        reservation.cancel()
        self.reservation_repository.update(reservation, connection)
        self.trip_repository.adjust_seats(
            reservation.trip.id, reservation.traveler_count, connection
        )
        reservation.trip.available_seats += reservation.traveler_count
        return reservation

    def get_customer_reservations(self, customer_id: int) -> list[Reservation]:
        """Return reservations for a known customer, including cancelled history."""
        self.customer_repository.get_by_id(customer_id)
        return self.reservation_repository.get_by_customer_id(customer_id)
