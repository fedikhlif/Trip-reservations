# TOUR Frontend

The Angular 17 app provides the TOUR interface in English and loads destination, trip, and reservation data from the Flask backend. The development server proxies `/api` to `http://127.0.0.1:8082` using `proxy.conf.json`.

## Run locally

From the project root, configure MySQL and start the backend in one terminal:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
python web_app.py
```

In another terminal, start the frontend:

```powershell
Set-Location .\tour-frontend
npm ci
npm start
```

Open `http://localhost:4200`. For MySQL setup and the `.env` example, see the project-root README.

## Data and API

The app uses the relative `/api` base URL configured in `src/environments/environment.ts`. `DestinationService`, `TripService`, and `ReservationService` call the backend's `/api/destinations`, `/api/trips`, `/api/trips/search`, and `/api/reservations` endpoints. The home form sends destination ID, departure/return date, and traveler count to the API; booking reserves the requested number of seats and displays the server's pending reservation.

Customers can register and sign in; reservations are scoped to the signed-in customer. Administrators provisioned with `python create_admin.py` can manage trips at `/admin/trips`. Payment and refund buttons are explicitly simulated. There is no currency in the backend schema.

The contact form is not submitted because the backend has no contact endpoint or mail provider.

For a same-origin production deployment, configure the web server to forward `/api` to Flask. If calling the API cross-origin, set the backend's `CORS_ORIGINS` environment variable to the exact trusted origins; do not use a wildcard.

## Build and test

```powershell
npm run build
npm test -- --watch=false
```

The build verifies Angular compilation. The Python API and reservation workflows are tested from the project root with `python -m unittest discover -s tests`.
