"""Explicitly copy legacy SQLite rows into an already-migrated SQLAlchemy DB."""

import argparse
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
import sqlite3

from database import Database
from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from models import (
    DestinationModel,
    PaymentModel,
    ReservationModel,
    TripModel,
    UserModel,
    UserRole,
)
from sqlalchemy import func, select


TABLES = ("users", "destinations", "trips", "reservations", "payments")


def import_legacy_sqlite(source_path: str | Path, database: Database) -> dict[str, int]:
    """Copy legacy SQLite data into an empty migrated target in FK order."""
    source_path = Path(source_path).resolve()
    source_uri = f"file:{source_path.as_posix()}?mode=ro"
    source = sqlite3.connect(source_uri, uri=True)
    source.row_factory = sqlite3.Row
    try:
        source_counts = {
            table: source.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            for table in TABLES
        }
        with database.session_scope() as session:
            target_counts = {
                "users": session.scalar(select(func.count()).select_from(UserModel)),
                "destinations": session.scalar(
                    select(func.count()).select_from(DestinationModel)
                ),
                "trips": session.scalar(select(func.count()).select_from(TripModel)),
                "reservations": session.scalar(
                    select(func.count()).select_from(ReservationModel)
                ),
                "payments": session.scalar(
                    select(func.count()).select_from(PaymentModel)
                ),
            }
            if any(target_counts.values()):
                raise ValueError(
                    "SQLite import requires an empty target schema; "
                    "no rows were copied."
                )

            for row in source.execute("SELECT * FROM users ORDER BY id"):
                session.add(
                    UserModel(
                        id=row["id"],
                        name=row["name"],
                        email=row["email"],
                        password_hash=row["password_hash"],
                        role=UserRole(row["role"].lower()),
                    )
                )
            for row in source.execute("SELECT * FROM destinations ORDER BY id"):
                session.add(
                    DestinationModel(
                        id=row["id"],
                        name=row["name"],
                        country=row["country"],
                        description=row["description"],
                    )
                )
            for row in source.execute("SELECT * FROM trips ORDER BY id"):
                session.add(
                    TripModel(
                        id=row["id"],
                        title=row["title"],
                        destination_id=row["destination_id"],
                        start_date=date.fromisoformat(row["start_date"]),
                        end_date=date.fromisoformat(row["end_date"]),
                        price=Decimal(row["price_cents"]) / Decimal(100),
                        available_seats=row["available_seats"],
                    )
                )
            for row in source.execute("SELECT * FROM reservations ORDER BY id"):
                session.add(
                    ReservationModel(
                        id=row["id"],
                        customer_id=row["customer_id"],
                        trip_id=row["trip_id"],
                        booking_date=datetime.fromisoformat(row["booking_date"]),
                        status=ReservationStatus[row["status"]],
                        total_price=Decimal(row["total_price_cents"]) / Decimal(100),
                    )
                )
            for row in source.execute("SELECT * FROM payments ORDER BY id"):
                session.add(
                    PaymentModel(
                        id=row["id"],
                        reservation_id=row["reservation_id"],
                        amount=Decimal(row["amount_cents"]) / Decimal(100),
                        method=PaymentMethod[row["method"]],
                        status=PaymentStatus[row["status"]],
                    )
                )
            session.flush()

        with database.session_scope() as session:
            target_after = {
                "users": session.scalar(select(func.count()).select_from(UserModel)),
                "destinations": session.scalar(
                    select(func.count()).select_from(DestinationModel)
                ),
                "trips": session.scalar(select(func.count()).select_from(TripModel)),
                "reservations": session.scalar(
                    select(func.count()).select_from(ReservationModel)
                ),
                "payments": session.scalar(
                    select(func.count()).select_from(PaymentModel)
                ),
            }
        if source_counts != target_after:
            raise RuntimeError(
                "Import verification failed: "
                f"source={source_counts}, target={target_after}"
            )
        return target_after
    finally:
        source.close()


def main() -> None:
    """Import the existing SQLite database into the configured MySQL target."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "trip_reservation.db",
        help="legacy SQLite database file (read only)",
    )
    args = parser.parse_args()
    database = Database()
    try:
        counts = import_legacy_sqlite(args.source, database)
    finally:
        database.dispose()
    print("Imported and verified row counts:")
    for table, count in counts.items():
        print(f"  {table}: {count}")


if __name__ == "__main__":
    main()