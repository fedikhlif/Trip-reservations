# Trip Reservation System

A Python 3.10+ command-line booking app using OOP, SQLAlchemy 2.x, MySQL 8, and Alembic. Payment operations are simulated; the project has no real authentication or payment provider.

## Architecture

- `domain/` contains persistence-independent dataclasses and business state methods.
- `models/` defines SQLAlchemy entities, constraints, enums, and relationships using Code First.
- `database.py` builds a MySQL engine from environment variables and provides commit/rollback session scopes.
- `repositories/` query ORM models and map rows to/from domain dataclasses. Services do not issue SQL.
- `services/` coordinate repository calls and business transactions.
- `web_app.py` serves a Flask booking interface on `http://127.0.0.1:8082`; `main.py` remains the terminal CLI. Swagger UI is served at `/api/docs/`.
- `alembic/` contains schema revisions generated from ORM metadata. Normal app startup never runs `create_all()`.
- `scripts/import_sqlite_to_mysql.py` is an explicit, optional transfer tool for the legacy SQLite file.
- `tests/` use isolated temporary SQLite databases; they never use the application database.

`Customer` and `Admin` remain subclasses of the domain `User`. Both are represented in one `users` table with a `role` column. Repository mappers select the proper domain subtype. ORM models are separate from those dataclasses to avoid persistence concerns and circular imports.

## ORM Schema

| Table | Key relationships and constraints |
| --- | --- |
| `users` | Primary key; unique email; role constrained to `customer` or `admin`. |
| `destinations` | Primary key; required name and country. |
| `trips` | Destination foreign key; date ordering; non-negative `Numeric(12, 2)` price and seat count. |
| `reservations` | Customer and trip foreign keys; status enum; non-negative `Numeric(12, 2)` total. |
| `payments` | Unique reservation foreign key; payment method/status enums; non-negative `Numeric(12, 2)` amount. |

Foreign keys use `RESTRICT` to retain reservation/payment history. Tables use InnoDB. Reservation creation locks the trip row and performs a conditional seat update in the same SQLAlchemy transaction; cancellation locks the reservation and restores one seat only after a valid state transition. These MySQL locking semantics are designed for InnoDB. They have been exercised against SQLite in tests, not against a live MySQL server in this environment.

**Cancellation policy:** Pending reservations may be cancelled. A confirmed reservation with a completed payment must be refunded first. Refund, reservation cancellation, and seat restoration share one transaction. A failed payment attempt is retained as the reservation's single payment, so a new attempt requires a new reservation.

## Install and Configure MySQL

Install MySQL Server 8 and make sure it is running. In a MySQL client, create a database and a dedicated local application user. Replace the placeholders with your own values; do not commit credentials:

```sql
CREATE DATABASE trip_reservation_db
	CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'your_mysql_username'@'localhost' IDENTIFIED BY 'your_mysql_password';
GRANT ALL PRIVILEGES ON trip_reservation_db.* TO 'your_mysql_username'@'localhost';
```

From the project directory, install packages and create a private environment file:

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. `.env` is ignored by Git. `DATABASE_URL` may alternatively be supplied as a SQLAlchemy URL.

## Migrations

The initial revision is `alembic/versions/1d1eef57ca4d_initial_schema.py`. It was generated from `Base.metadata`, reviewed, and applied to a disposable SQLite database to test the Alembic path. It has **not** been applied to MySQL here.

For a fresh MySQL database, first review the checked-in migration, then run:

```powershell
alembic upgrade head
alembic current
```

When changing ORM models later, generate and inspect a new revision before applying it:

```powershell
alembic revision --autogenerate -m "describe schema change"
```

Then review the generated file under `alembic/versions/`, apply with `alembic upgrade head`, and verify with `alembic current`. Do not use `Base.metadata.create_all()` for production schema changes.

## Preserve Existing SQLite Data

`trip_reservation.db` is not deleted or modified by this migration. MySQL does not import it automatically. The optional importer requires an empty, already-migrated target and verifies per-table row counts. Run it **before** starting the application, since app startup inserts sample rows:

```powershell
python -m scripts.import_sqlite_to_mysql --source trip_reservation.db
```

The importer opens the source file read-only and copies IDs, relationships, and money values. The existing file currently contains 2 users, 2 destinations, 2 trips, 0 reservations, and 0 payments. That sample data was imported and count-checked against a disposable SQLite target. A live MySQL import is not verified until you run it with your own configured server.

## Run

The CLI applies pending Alembic revisions before opening its menus. The web app applies them on its first database-backed request. This still requires a valid MySQL connection and credentials; Swagger/docs and the connection warning can load without one. No `create_all()` is used.

You can also apply and verify migrations manually:

```powershell
python -m alembic upgrade head
python -m alembic current
```

After MySQL is configured, start the browser interface:

```powershell
python web_app.py
```

Open `http://127.0.0.1:8082`. The web server starts before opening a database connection; if credentials or migrations are not ready, it displays a database warning. Fix `.env`, apply migrations, and restart the server. `DB_PORT=3306` is the MySQL port, not the web port.

Open `http://127.0.0.1:8082/api/docs/` to try `GET /api/trips`, reservation list/create/cancel, simulated payments, and refunds. The OpenAPI JSON document is available at `/api/openapi.json`.

To use the existing terminal interface instead:

```powershell
python main.py
```

Sample customer: Jordan Lee. Sample administrator: Morgan Admin. The demo does not request passwords.

## Tests

```powershell
python -m unittest discover -s tests
```

All tests use temporary SQLite files and validate ORM mapping, constraints, transaction rollback, persistence, booking concurrency, and Alembic upgrade. This is not a substitute for running the suite against MySQL/InnoDB; that requires a configured MySQL server and isolated test database.

## TOUR Angular Frontend

The existing TOUR application lives in `tour-frontend/`. It keeps its Angular design and uses the Flask API for destinations, trips, bookings, reservations, and simulated payment operations. The API returns only fields stored by the backend; presentation-only imagery is a shared visual fallback, and the database does not currently define a currency.

Configure `.env` from `.env.example`, then install the Python dependencies and migrate the database:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
```

The new Alembic revision adds `reservations.traveler_count` with a default of `1`, preserving existing rows. Review the migration before applying it to an existing MySQL database. No database is deleted or recreated.

Start the backend in one terminal from the project root:

```powershell
python web_app.py
```

Start the Angular development server in a second terminal:

```powershell
Set-Location .\tour-frontend
npm ci
npm start
```

Open `http://localhost:4200`. Angular proxies `/api` to `http://127.0.0.1:8082`; the backend's configurable `CORS_ORIGINS` setting allows the local Angular origin for direct API access. The production Angular environment also uses the relative `/api` path, so production hosting must route that path to Flask and set `CORS_ORIGINS` to the exact trusted origins if cross-origin requests are used.

### API used by TOUR

| Method and path | Purpose |
| --- | --- |
| `GET /api/destinations` | List destinations as `{id, name, country, description}`. |
| `GET /api/destinations/{destination_id}` | Retrieve one destination. |
| `GET /api/trips` | List available trips; supports the legacy `destination`, `date`, and `max_price` filters. |
| `GET /api/trips/search` | Search with `destination_id`, `departure_date`, `return_date`, `travelers`, and `max_price`. Trips must fit in the requested date window and have enough seats. |
| `GET /api/trips/{trip_id}` | Retrieve a trip and its current availability. |
| `GET /api/reservations` | List reservations for the seeded demo customer. |
| `POST /api/reservations` | Create a booking with `{"trip_id": 1, "travelers": 2}`. Returns the reservation, total price, current status, and traveler count. |
| `POST /api/reservations/{reservation_id}/cancel` | Cancel an eligible demo-customer reservation and restore its seats. |
| `POST /api/reservations/{reservation_id}/payments` | Record a simulated payment with `{"amount": "2598.00", "method": "CREDIT_CARD", "succeed": true}`. |
| `POST /api/payments/{payment_id}/refund` | Simulate a refund and cancel the associated confirmed reservation. |
| `GET /api/openapi.json` | OpenAPI contract; Swagger UI is at `/api/docs/`. |

Successful reservation creation returns HTTP `201`; invalid input returns `400`, booking conflicts such as insufficient seats return `409`, missing items return `404`, and database errors return `503`. Trip prices have no currency field in the current schema, so TOUR displays the catalog amount without inventing a currency.

### Current limitations

- The existing backend has no authentication or registered customer flow. The API and reservation screen use the seeded “Jordan Lee” demo customer; they must not be exposed as a production customer-account system.
- There are no authenticated admin API routes. Administrative actions are therefore not exposed in TOUR.
- Payments and refunds only update local application state. No real payment provider is integrated.
- The existing contact form has no backend or mail-delivery integration; TOUR now reports that it cannot send the message instead of showing a false success.
- MySQL startup, migrations, and the optional legacy SQLite import still require the operator's configured MySQL server and credentials. The automated tests use isolated SQLite databases.

### Verify the integration

Run backend tests from the project root and build the TOUR app:

```powershell
python -m unittest discover -s tests
Set-Location .\tour-frontend
npm run build
```

For an end-to-end local check, open the home page, select the dates of a trip returned by `/api/trips`, choose a traveler count within its availability, create the reservation, then visit **Mes réservations** to simulate payment or cancel it. A completed simulated payment can be refunded there; no external charge is made.