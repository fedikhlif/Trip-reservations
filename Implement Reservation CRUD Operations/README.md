# Roamly Trip Reservation Frontend

A standalone React/Vite frontend for a future Python Trip Reservation System API. It uses mock data by default and does not modify or depend on backend files.

## Run locally

```bash
pnpm install
pnpm dev
```

You can also use npm:

```bash
npm install
npm run dev
```

## Place beside the Python backend

Copy the contents of this project into a sibling folder named `trip_reservation_frontend`:

```text
trip reservations/
├── trip_reservation_system/     # existing Python backend (unchanged)
└── trip_reservation_frontend/   # copy this frontend here
```

Then open a terminal in `trip_reservation_frontend`, install dependencies, and run the frontend separately. Run the Python backend from its own folder and terminal.

## Configuration

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_USE_MOCK_DATA=true
```

Mock data remains active until a real API is implemented. `src/services/api.ts` is the future HTTP client boundary. Do not set `VITE_USE_MOCK_DATA=false` until the backend endpoints exist and page data hooks are connected to them.

## Required backend API contract

The exact request/response schemas should match your Python domain models. The frontend will need endpoints equivalent to:

| Area | Suggested endpoints |
| --- | --- |
| Authentication | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Trips | `GET /trips`, `GET /trips/{id}`, `POST /trips`, `PATCH /trips/{id}`, `DELETE /trips/{id}` |
| Destinations | `GET /destinations`, `GET /destinations/{id}` |
| Customers | `GET /customers/{id}`, `PATCH /customers/{id}` |
| Reservations | `GET /reservations`, `GET /reservations/{id}`, `POST /reservations`, `PATCH /reservations/{id}`, `POST /reservations/{id}/cancel` |
| Payments | `GET /payments/{id}`, `GET /reservations/{id}/payment`, `POST /payments` |

The backend must enable CORS for the Vite frontend origin (commonly `http://localhost:5173`) and should return structured validation errors for forms.

## Routes

- `/` — landing page
- `/trips` — searchable trip catalog
- `/trips/:tripId` — trip details and reservation form
- `/reservations` — reservation management
- `/payment/:reservationId` — payment status
- `/dashboard` — customer dashboard
- `/admin` — administrator dashboard
