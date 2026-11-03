"""Create a fresh SQLite database with the correct current schema and seed data."""

import os
from pathlib import Path

# Point to fresh database file
os.environ["DATABASE_URL"] = "sqlite:///trip_reservation_fresh.db"

from database import Database, upgrade_schema

print("Creating fresh database...")
db = Database()
upgrade_schema(db)
print("Migrations applied.")

from main import build_application
build_application(db)
print("Seed data inserted.")

db.dispose()
print("Done — trip_reservation_fresh.db is ready.")

