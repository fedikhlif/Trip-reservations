"""SQLAlchemy persistence for destinations."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Database
from domain.destination import Destination
from models import DestinationModel
from repositories.mappers import destination_to_domain


class DestinationRepository:
    """Store and retrieve destinations by ID."""

    def __init__(self, database: Database) -> None:
        self.database = database

    def add(self, destination: Destination, session: Session | None = None) -> None:
        """Insert a destination with an explicit ID."""
        if session is None:
            with self.database.session_scope() as session:
                self.add(destination, session)
            return
        session.add(
            DestinationModel(
                id=destination.id,
                name=destination.name,
                country=destination.country,
                description=destination.description,
                image_url=destination.image_url or None,
            )
        )

    def add_with_auto_id(self, destination: Destination) -> Destination:
        """Insert a destination letting the database assign the ID, then return it."""
        with self.database.session_scope() as session:
            model = DestinationModel(
                name=destination.name,
                country=destination.country,
                description=destination.description,
                image_url=destination.image_url or None,
            )
            session.add(model)
            session.flush()
            return destination_to_domain(model)

    def get_by_id(
        self, destination_id: int, session: Session | None = None
    ) -> Destination:
        """Return a destination or raise a descriptive error."""
        if session is None:
            with self.database.session_scope() as session:
                return self.get_by_id(destination_id, session)
        model = session.get(DestinationModel, destination_id)
        if model is None:
            raise KeyError(f"Destination {destination_id} was not found.")
        return destination_to_domain(model)

    def get_all(self) -> list[Destination]:
        """Return all destinations in stable ID order."""
        with self.database.session_scope() as session:
            models = session.scalars(
                select(DestinationModel).order_by(DestinationModel.id)
            ).all()
            return [destination_to_domain(model) for model in models]

    def update(self, destination: Destination) -> None:
        """Update an existing destination including image_url."""
        with self.database.session_scope() as session:
            model = session.get(DestinationModel, destination.id)
            if model is None:
                raise KeyError(f"Destination {destination.id} was not found.")
            model.name = destination.name
            model.country = destination.country
            model.description = destination.description
            if destination.image_url:
                model.image_url = destination.image_url

    def delete(self, destination_id: int) -> None:
        """Delete only destinations not referenced by trips."""
        with self.database.session_scope() as session:
            model = session.get(DestinationModel, destination_id)
            if model is None:
                raise KeyError(f"Destination {destination_id} was not found.")
            session.delete(model)
