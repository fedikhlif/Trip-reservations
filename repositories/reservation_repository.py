"""SQLAlchemy persistence for reservations and their required relationships."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Database
from domain.enums import ReservationStatus
from domain.reservation import Reservation
from models import ReservationModel
from repositories.customer_repository import CustomerRepository
from repositories.mappers import reservation_to_domain
from repositories.trip_repository import TripRepository


class ReservationRepository:
    """Store reservations while resolving customer, trip, and payment links."""

    def __init__(
        self,
        database: Database,
        customers: CustomerRepository,
        trips: TripRepository,
    ) -> None:
        self.database = database
        self.customers = customers
        self.trips = trips

    def add(
        self,
        reservation: Reservation,
        session: Session | None = None,
    ) -> None:
        """Insert a reservation and assign its generated ID if needed."""
        if session is None:
            with self.database.session_scope() as session:
                self.add(reservation, session)
            return
        model = ReservationModel(
            id=reservation.id or None,
            customer_id=reservation.customer.id,
            trip_id=reservation.trip.id,
            booking_date=reservation.booking_date,
            status=reservation.status,
            total_price=reservation.total_price,
            traveler_count=reservation.traveler_count,
        )
        session.add(model)
        session.flush()
        reservation.id = model.id

    def get_by_id(
        self,
        reservation_id: int,
        session: Session | None = None,
        for_update: bool = False,
    ) -> Reservation:
        """Return one reservation with its optional payment relationship."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_by_id(reservation_id, session, for_update)
        statement = select(ReservationModel).where(
            ReservationModel.id == reservation_id
        )
        if for_update:
            statement = statement.with_for_update()
        model = session.scalar(statement)
        if model is None:
            raise KeyError(f"Reservation {reservation_id} was not found.")
        return reservation_to_domain(model)

    def get_all(self) -> list[Reservation]:
        """Return all reservations in ID order."""
        with self.database.session_scope() as session:
            models = session.scalars(
                select(ReservationModel).order_by(ReservationModel.id)
            ).all()
            return [reservation_to_domain(model) for model in models]

    def get_by_customer_id(self, customer_id: int) -> list[Reservation]:
        """Return reservation history for one customer."""
        with self.database.session_scope() as session:
            models = session.scalars(
                select(ReservationModel)
                .where(ReservationModel.customer_id == customer_id)
                .order_by(ReservationModel.id)
            ).all()
            return [reservation_to_domain(model) for model in models]

    def has_active_for_trip(
        self, customer_id: int, trip_id: int, session: Session
    ) -> bool:
        """Check for pending/confirmed reservations inside the booking transaction."""
        reservation_id = session.scalar(
            select(ReservationModel.id)
            .where(
                ReservationModel.customer_id == customer_id,
                ReservationModel.trip_id == trip_id,
                ReservationModel.status.in_(
                    (ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                ),
            )
            .limit(1)
        )
        return reservation_id is not None

    def update(
        self,
        reservation: Reservation,
        session: Session | None = None,
    ) -> None:
        """Update reservation status and total without dropping its history."""
        if session is None:
            with self.database.session_scope() as session:
                self.update(reservation, session)
            return
        model = session.get(ReservationModel, reservation.id)
        if model is None:
            raise KeyError(f"Reservation {reservation.id} was not found.")
        model.customer_id = reservation.customer.id
        model.trip_id = reservation.trip.id
        model.booking_date = reservation.booking_date
        model.status = reservation.status
        model.total_price = reservation.total_price
        model.traveler_count = reservation.traveler_count

    def delete(self, reservation_id: int) -> None:
        """Retain reservation history; cancel reservations instead of deleting."""
        self.get_by_id(reservation_id)
        raise ValueError("Reservation history is retained; cancel the reservation.")

    def transaction(self):
        """Expose an immediate database transaction for booking workflows."""
        return self.database.session_scope()
