"""SQLAlchemy persistence for trips and seat inventory."""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from database import Database
from domain.trip import Trip
from repositories.destination_repository import DestinationRepository
from models import DestinationModel, TripModel
from repositories.mappers import trip_to_domain


class TripRepository:
    """Store trips and resolve their destination relationship."""

    def __init__(
        self, database: Database, destinations: DestinationRepository
    ) -> None:
        self.database = database
        self.destinations = destinations

    def add(self, trip: Trip, session: Session | None = None) -> None:
        """Insert a trip and its destination foreign-key reference."""
        if session is None:
            with self.database.session_scope() as session:
                self.add(trip, session)
            return
        session.add(
            TripModel(
                id=trip.id,
                title=trip.title,
                destination_id=trip.destination.id,
                start_date=trip.start_date,
                end_date=trip.end_date,
                price=trip.price,
                available_seats=trip.available_seats,
            )
        )

    def add_with_auto_id(self, trip: Trip) -> Trip:
        """Insert a trip and let the database assign its ID."""
        with self.database.session_scope() as session:
            model = TripModel(
                title=trip.title,
                destination_id=trip.destination.id,
                start_date=trip.start_date,
                end_date=trip.end_date,
                price=trip.price,
                available_seats=trip.available_seats,
            )
            session.add(model)
            session.flush()
            trip.id = model.id
        return trip

    def get_by_id(
        self,
        trip_id: int,
        session: Session | None = None,
        for_update: bool = False,
    ) -> Trip:
        """Return a trip with its destination or raise a descriptive error."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_by_id(trip_id, session, for_update)
        statement = select(TripModel).where(TripModel.id == trip_id)
        if for_update:
            statement = statement.with_for_update()
        model = session.scalar(statement)
        if model is None:
            raise KeyError(f"Trip {trip_id} was not found.")
        return trip_to_domain(model)

    def get_all(self) -> list[Trip]:
        """Return all trips in ID order."""
        with self.database.session_scope() as session:
            models = session.scalars(select(TripModel).order_by(TripModel.id)).all()
            return [trip_to_domain(model) for model in models]

    def search_available(
        self,
        destination: str | None = None,
        on_date: date | None = None,
        max_price: Decimal | None = None,
        destination_id: int | None = None,
        departure_date: date | None = None,
        return_date: date | None = None,
        travelers: int = 1,
    ) -> list[Trip]:
        """Search trips with bound filters and a minimum available seat count."""
        if travelers < 1:
            raise ValueError("Traveler count must be at least one.")
        if (
            departure_date is not None
            and return_date is not None
            and return_date < departure_date
        ):
            raise ValueError("Return date cannot be before departure date.")
        statement = (
            select(TripModel)
            .join(TripModel.destination)
            .where(TripModel.available_seats >= travelers)
        )
        if destination_id is not None:
            statement = statement.where(
                TripModel.destination_id == destination_id
            )
        if destination:
            query = destination.strip().casefold()
            statement = statement.where(
                or_(
                    func.lower(DestinationModel.name).contains(
                        query, autoescape=True
                    ),
                    func.lower(DestinationModel.country).contains(
                        query, autoescape=True
                    ),
                )
            )
        if on_date:
            statement = statement.where(
                TripModel.start_date <= on_date,
                TripModel.end_date >= on_date,
            )
        if departure_date is not None:
            statement = statement.where(TripModel.start_date >= departure_date)
        if return_date is not None:
            statement = statement.where(TripModel.end_date <= return_date)
        if max_price is not None:
            statement = statement.where(TripModel.price <= Decimal(str(max_price)))
        with self.database.session_scope() as session:
            models = session.scalars(statement.order_by(TripModel.id)).all()
            return [trip_to_domain(model) for model in models]

    def update(
        self, trip: Trip, session: Session | None = None
    ) -> None:
        """Update trip fields and inventory."""
        if session is None:
            with self.database.session_scope() as session:
                self.update(trip, session)
            return
        model = session.get(TripModel, trip.id)
        if model is None:
            raise KeyError(f"Trip {trip.id} was not found.")
        model.title = trip.title
        model.destination_id = trip.destination.id
        model.start_date = trip.start_date
        model.end_date = trip.end_date
        model.price = trip.price
        model.available_seats = trip.available_seats

    def reserve_one_seat(self, trip_id: int, session: Session) -> bool:
        """Atomically claim one seat, safe across concurrent InnoDB writers."""
        return self.reserve_seats(trip_id, 1, session)

    def reserve_seats(
        self, trip_id: int, count: int, session: Session
    ) -> bool:
        """Atomically claim the requested number of seats."""
        result = session.execute(
            update(TripModel)
            .where(
                TripModel.id == trip_id,
                TripModel.available_seats >= count,
            )
            .values(available_seats=TripModel.available_seats - count)
            .execution_options(synchronize_session=False)
        )
        return result.rowcount == 1

    def adjust_seats(
        self,
        trip_id: int,
        adjustment: int,
        session: Session,
    ) -> None:
        """Adjust inventory without allowing negative seats."""
        result = session.execute(
            update(TripModel)
            .where(
                TripModel.id == trip_id,
                TripModel.available_seats + adjustment >= 0,
            )
            .values(available_seats=TripModel.available_seats + adjustment)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            raise ValueError("Trip does not exist or has no available seats.")

    def delete(self, trip_id: int) -> None:
        """Delete only trips that have no reservation history."""
        with self.database.session_scope() as session:
            model = session.get(TripModel, trip_id)
            if model is None:
                raise KeyError(f"Trip {trip_id} was not found.")
            session.delete(model)

    def transaction(self):
        """Expose the database transaction for coordinated booking operations."""
        return self.database.session_scope()