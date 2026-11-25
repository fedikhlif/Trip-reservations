"""Local web interface for the trip reservation system."""

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import logging
import os

from flask import Flask, flash, redirect, render_template, request, session, url_for
from flask_swagger_ui import get_swaggerui_blueprint
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

from api import create_api_blueprint
from auth_api import SESSION_CUSTOMER_ID_KEY, create_auth_blueprint
from database import Database, upgrade_schema
from domain.enums import PaymentMethod
from main import build_application
from repositories.customer_repository import CustomerRepository
from services.auth_service import AuthService

logger = logging.getLogger(__name__)


def create_app(database: Database | None = None) -> Flask:
    """Create the local booking site without connecting until the first request."""
    load_dotenv()
    app = Flask(__name__)


    # ── Session & security configuration ────────────────────────────────────
    secret = os.getenv("FLASK_SECRET_KEY", "local-development-key-change-in-production")
    if secret == "local-development-key-change-in-production":
        logger.warning(
            "FLASK_SECRET_KEY is not set. Using insecure development key. "
            "Set FLASK_SECRET_KEY in your .env file before deploying."
        )
    app.secret_key = secret
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("FLASK_ENV") == "production",
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        DEMO_CUSTOMER_ID=1,
    )
    app.config["CORS_ORIGINS"] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200"
        ).split(",")
        if origin.strip()
    )
    app.config["AUTO_MIGRATE"] = database is None
    app.extensions["trip_database"] = database or Database()
    app.extensions["trip_services"] = None

    def services():
        """Initialize the migrated database-backed services on first use."""
        if app.extensions["trip_services"] is None:
            if app.config["AUTO_MIGRATE"]:
                upgrade_schema(app.extensions["trip_database"])
            app.extensions["trip_services"] = build_application(
                app.extensions["trip_database"]
            )
        return app.extensions["trip_services"]

    def get_auth_service() -> AuthService:
        """Return an AuthService backed by the same database connection pool."""
        services()  # ensure migrations have run
        customer_repository = CustomerRepository(app.extensions["trip_database"])
        return AuthService(customer_repository)

    # ── Register blueprints ─────────────────────────────────────────────────
    app.register_blueprint(create_api_blueprint(services, get_auth_service))
    app.register_blueprint(create_auth_blueprint(get_auth_service))

    swagger_blueprint = get_swaggerui_blueprint(
        "/api/docs",
        "/api/openapi.json",
        config={"app_name": "Trip Reservation API"},
    )
    app.register_blueprint(swagger_blueprint, url_prefix="/api/docs")

    # ── CORS ────────────────────────────────────────────────────────────────
    @app.before_request
    def handle_api_preflight():
        if request.path.startswith("/api") and request.method == "OPTIONS":
            response = app.make_response(("", 204))
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, Accept"
            )
            origin = request.headers.get("Origin", "")
            if origin in app.config["CORS_ORIGINS"]:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers.add("Vary", "Origin")
            return response
        return None

    @app.after_request
    def add_security_headers(response):
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.after_request
    def add_api_cors_headers(response):
        if request.path.startswith("/api"):
            origin = request.headers.get("Origin")
            if origin in app.config["CORS_ORIGINS"]:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers.add("Vary", "Origin")
        return response

    # ── Jinja2 routes (kept for legacy Flask template UI) ───────────────────
    @app.get("/")
    def index():
        destination = request.args.get("destination", "").strip()
        date_text = request.args.get("date", "").strip()
        price_text = request.args.get("max_price", "").strip()
        try:
            on_date = date.fromisoformat(date_text) if date_text else None
            max_price = Decimal(price_text) if price_text else None
            (
                customer,
                _admin,
                trip_service,
                reservation_service,
                _payment_service,
                _destination_repository,
            ) = services()
            trips = trip_service.search_trips(destination or None, on_date, max_price)
            reservations = customer.view_reservations(reservation_service)
            return render_template(
                "index.html",
                trips=trips,
                reservations=reservations,
                destination_filter=destination,
                date_filter=date_text,
                price_filter=price_text,
                database_error=False,
            )
        except (ValueError, InvalidOperation) as error:
            flash(str(error), "error")
            return redirect(url_for("index"))
        except SQLAlchemyError:
            logger.exception("Database request failed")
            return render_template(
                "index.html",
                trips=[],
                reservations=[],
                destination_filter=destination,
                date_filter=date_text,
                price_filter=price_text,
                database_error=True,
            ), 503

    @app.post("/reservations")
    def reserve_trip():
        try:
            customer, _admin, _trips, reservation_service, _payments, _destinations = (
                services()
            )
            reservation = customer.make_reservation(
                reservation_service, int(request.form["trip_id"])
            )
            flash(f"Reservation #{reservation.id} created.", "success")
        except (ValueError, KeyError, SQLAlchemyError) as error:
            flash(_safe_error(error), "error")
        return redirect(url_for("index"))

    @app.post("/reservations/<int:reservation_id>/cancel")
    def cancel_reservation(reservation_id: int):
        try:
            customer, _admin, _trips, reservation_service, _payments, _destinations = (
                services()
            )
            customer.cancel_reservation(reservation_service, reservation_id)
            flash(f"Reservation #{reservation_id} cancelled.", "success")
        except (ValueError, KeyError, PermissionError, SQLAlchemyError) as error:
            flash(_safe_error(error), "error")
        return redirect(url_for("index"))

    @app.post("/reservations/<int:reservation_id>/pay")
    def process_payment(reservation_id: int):
        try:
            *_prefix, payment_service, _destinations = services()
            method = PaymentMethod[request.form["method"]]
            payment = payment_service.process_payment(
                reservation_id,
                Decimal(request.form["amount"]),
                method,
                succeed=request.form.get("outcome", "succeed") == "succeed",
            )
            flash(f"Simulated payment: {payment.status.name}.", "success")
        except (ValueError, KeyError, InvalidOperation, SQLAlchemyError) as error:
            flash(_safe_error(error), "error")
        return redirect(url_for("index"))

    @app.post("/payments/<int:payment_id>/refund")
    def refund_payment(payment_id: int):
        try:
            *_prefix, payment_service, _destinations = services()
            payment_service.refund_payment(payment_id)
            flash(f"Payment #{payment_id} refunded.", "success")
        except (ValueError, KeyError, SQLAlchemyError) as error:
            flash(_safe_error(error), "error")
        return redirect(url_for("index"))

    @app.get("/health")
    def health():
        return {"status": "ok", "database": "checked on page request"}

    return app


def _safe_error(error: Exception) -> str:
    """Avoid returning driver details or credentials in rendered pages."""
    if isinstance(error, SQLAlchemyError):
        logger.exception("Database operation failed", exc_info=error)
        return "Database unavailable. Check MySQL settings and migrations."
    return str(error)


if __name__ == "__main__":
    from werkzeug.serving import WSGIRequestHandler
    WSGIRequestHandler.server_version = "TOUR-API"
    WSGIRequestHandler.sys_version = ""
    web_app = create_app()
    try:
        web_app.run(host="127.0.0.1", port=8082, debug=True)
    finally:
        web_app.extensions["trip_database"].dispose()