# Trip Desk — Angular Frontend

> Angular 19 frontend for the Trip Desk reservation system, migrated from the
> original Flask/Jinja2 server-rendered template.

---

## Project structure

```
frontend/                          ← Angular application root
├── proxy.conf.json                ← Dev-server CORS proxy → Flask backend
├── src/
│   ├── environments/
│   │   ├── environment.ts         ← Development API URL
│   │   └── environment.prod.ts   ← Production API URL (edit before deploy)
│   ├── styles.scss                ← Global styles (1-to-1 from trip-desk.css)
│   └── app/
│       ├── core/
│       │   ├── interceptors/
│       │   │   └── auth.interceptor.ts     ← JSON headers + error normalisation
│       │   └── services/
│       │       ├── trip.service.ts         ← GET /api/trips
│       │       ├── reservation.service.ts  ← GET/POST /api/reservations, cancel
│       │       └── payment.service.ts      ← POST payments + refund
│       ├── shared/
│       │   ├── components/
│       │   │   ├── navbar/                 ← Forest-green topbar
│       │   │   ├── footer/                 ← Bottom bar
│       │   │   └── loading-spinner/        ← Spinner for async states
│       │   └── models/
│       │       ├── trip.model.ts
│       │       ├── reservation.model.ts
│       │       └── payment.model.ts
│       └── features/
│           └── home/                       ← Trip catalogue + reservation ledger
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 18 LTS |
| npm | 9+ |
| Angular CLI | 19 (installed locally via npm) |

---

## Getting started

### 1 — Install dependencies

```bash
cd frontend
npm install
```

### 2 — Start the Flask backend (separate terminal)

```bash
cd ..                    # back to trip_reservation_system/
python web_app.py        # runs on http://127.0.0.1:8082
```

> The Angular dev server proxies `/api/*` requests to the Flask backend via
> `proxy.conf.json`. No CORS configuration is required during development.

### 3 — Start the Angular dev server

```bash
npm run start
```

Open <http://localhost:4200> in your browser.

---

## Available npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `ng serve` | Development server with proxy |
| `build` | `ng build` | Production build in `dist/frontend/` |
| `watch` | `ng build --watch --configuration development` | Incremental dev build |
| `test` | `ng test` | Unit tests (Karma) |

---

## Backend API

The Angular services call the Flask REST API defined in `api.py`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips` | List/search trips (`destination`, `date`, `max_price`) |
| GET | `/api/reservations` | List demo-customer reservations |
| POST | `/api/reservations` | Create a reservation `{ trip_id }` |
| POST | `/api/reservations/{id}/cancel` | Cancel a reservation |
| POST | `/api/reservations/{id}/payments` | Process payment `{ amount, method, succeed }` |
| POST | `/api/payments/{id}/refund` | Refund a completed payment |

### Backend requirements before API calls work

1. Python 3.11+ with requirements installed (`pip install -r requirements.txt`).
2. A running MySQL database with credentials in `.env`.
3. Alembic migration applied: `python -m alembic upgrade head`.
4. Flask dev server started: `python web_app.py` (port 8082).

### What cannot be tested without the backend

- Creating reservations (requires a live `trip_id` from the DB).
- Payment processing and refunds.
- Accurate trip seat counts.

---

## Environment configuration

Edit `src/environments/environment.ts` to change the API base URL:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8082/api',
};
```

For production deployments, update `src/environments/environment.prod.ts`.

---

## Design fidelity

The Angular application reproduces the original Flask/Jinja2 UI pixel-for-pixel:

- **Color palette:** forest green, copper, sage, cream paper background.
- **Typography:** Georgia (headings), Trebuchet MS (body).
- **Layout:** CSS Grid — trip rows, reservation rows, filter form.
- **Responsive:** Three breakpoints (desktop ≥ 851 px, tablet 601–850 px, mobile ≤ 600 px).
- **Interactions:** Search, reserve, pay, cancel, refund — all wired to real API calls.

---

## Original source files (not modified)

```
trip_reservation_system/
├── templates/index.html       ← Original Jinja2 template (preserved)
├── static/trip-desk.css       ← Original CSS (migrated to styles.scss)
├── api.py                     ← Flask REST API (unchanged)
├── web_app.py                 ← Flask web app (unchanged)
└── ...                        ← All other Python backend files (unchanged)
```
