"""OpenAPI-described JSON endpoints backed by the existing application services."""

from datetime import date
from decimal import Decimal, InvalidOperation
import logging
import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename

from flask import Blueprint, jsonify, request, session, send_from_directory, current_app
from sqlalchemy.exc import SQLAlchemyError

from auth_api import SESSION_ADMIN_ID_KEY, SESSION_CUSTOMER_ID_KEY
from domain.admin import Admin
from domain.destination import Destination
from domain.enums import PaymentMethod
from domain.payment import Payment
from domain.reservation import Reservation
from domain.trip import Trip
from models import DestinationModel
from services.reservation_service import ReservationConflictError

logger = logging.getLogger(__name__)

OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "Trip Reservation API",
        "version": "2.0.0",
        "description": "TOUR API — session-authenticated endpoints.",
    },
    "servers": [{"url": "http://127.0.0.1:8082"}],
    "tags": [
        {"name": "Auth"},
        {"name": "Trips"},
        {"name": "Destinations"},
        {"name": "Reservations"},
        {"name": "Payments"},
        {"name": "Admin"},
    ],
    "paths": {
        "/api/auth/register": {
            "post": {
                "tags": ["Auth"],
                "summary": "Register a new customer account",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/RegisterRequest"}}}},
                "responses": {
                    "201": {"description": "Account created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CustomerProfile"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "409": {"description": "Email already in use"},
                },
            }
        },
        "/api/auth/login": {
            "post": {
                "tags": ["Auth"],
                "summary": "Authenticate with email and password",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/LoginRequest"}}}},
                "responses": {
                    "200": {"description": "Authenticated", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CustomerProfile"}}}},
                    "401": {"description": "Invalid credentials"},
                },
            }
        },
        "/api/auth/me": {
            "get": {
                "tags": ["Auth"],
                "summary": "Return the authenticated customer profile",
                "responses": {
                    "200": {"description": "Profile", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CustomerProfile"}}}},
                    "401": {"description": "Not authenticated"},
                },
            }
        },
        "/api/auth/logout": {
            "post": {
                "tags": ["Auth"],
                "summary": "End the current session",
                "responses": {"200": {"description": "Logged out"}},
            }
        },
        "/api/trips": {
            "get": {
                "tags": ["Trips"],
                "summary": "List and search available trips",
                "parameters": [
                    {"name": "destination", "in": "query", "schema": {"type": "string"}},
                    {"name": "destination_id", "in": "query", "schema": {"type": "integer", "minimum": 1}},
                    {"name": "date", "in": "query", "schema": {"type": "string", "format": "date"}},
                    {"name": "departure_date", "in": "query", "schema": {"type": "string", "format": "date"}},
                    {"name": "return_date", "in": "query", "schema": {"type": "string", "format": "date"}},
                    {"name": "travelers", "in": "query", "schema": {"type": "integer", "minimum": 1}, "description": "Minimum available seats required."},
                    {"name": "max_price", "in": "query", "schema": {"type": "number", "format": "double", "minimum": 0}},
                ],
                "responses": {
                    "200": {"description": "Available trips", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Trip"}}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/trips/search": {
            "get": {
                "tags": ["Trips"],
                "summary": "Search available trips",
                "parameters": [
                    {"name": "destination_id", "in": "query", "schema": {"type": "integer", "minimum": 1}},
                    {"name": "departure_date", "in": "query", "schema": {"type": "string", "format": "date"}},
                    {"name": "return_date", "in": "query", "schema": {"type": "string", "format": "date"}},
                    {"name": "travelers", "in": "query", "schema": {"type": "integer", "minimum": 1}},
                ],
                "responses": {
                    "200": {"description": "Matching available trips", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Trip"}}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                },
            }
        },
        "/api/destinations": {
            "get": {
                "tags": ["Destinations"],
                "summary": "List destinations",
                "responses": {
                    "200": {"description": "Destinations", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Destination"}}}}},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/destinations/{destination_id}": {
            "get": {
                "tags": ["Destinations"],
                "summary": "Retrieve a destination",
                "parameters": [{"$ref": "#/components/parameters/DestinationId"}],
                "responses": {
                    "200": {"description": "Destination", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Destination"}}}},
                    "404": {"description": "Destination not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/trips/{trip_id}": {
            "get": {
                "tags": ["Trips"],
                "summary": "Retrieve a trip",
                "parameters": [{"$ref": "#/components/parameters/TripId"}],
                "responses": {
                    "200": {"description": "Trip", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Trip"}}}},
                    "404": {"description": "Trip not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/admin/trips": {
            "get": {
                "tags": ["Admin"],
                "summary": "List all trips for an administrator",
                "responses": {
                    "200": {"description": "All trips", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Trip"}}}}},
                    "403": {"description": "Administrator access required"},
                },
            },
            "post": {
                "tags": ["Admin"],
                "summary": "Create a trip",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/TripWrite"}}}},
                "responses": {
                    "201": {"description": "Trip created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Trip"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "403": {"description": "Administrator access required"},
                },
            },
        },
        "/api/admin/trips/{trip_id}": {
            "put": {
                "tags": ["Admin"],
                "summary": "Update a trip",
                "parameters": [{"$ref": "#/components/parameters/TripId"}],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/TripWrite"}}}},
                "responses": {
                    "200": {"description": "Trip updated", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Trip"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "403": {"description": "Administrator access required"},
                    "404": {"description": "Trip or destination not found"},
                },
            },
            "delete": {
                "tags": ["Admin"],
                "summary": "Delete a trip without reservation history",
                "parameters": [{"$ref": "#/components/parameters/TripId"}],
                "responses": {
                    "204": {"description": "Trip deleted"},
                    "403": {"description": "Administrator access required"},
                    "404": {"description": "Trip not found"},
                    "409": {"description": "Trip has reservation history"},
                },
            },
        },
        "/api/reservations": {
            "get": {
                "tags": ["Reservations"],
                "summary": "List reservations for the authenticated customer",
                "responses": {
                    "200": {"description": "Reservation history", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Reservation"}}}}},
                    "401": {"description": "Not authenticated"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            },
            "post": {
                "tags": ["Reservations"],
                "summary": "Reserve seats for the authenticated customer",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateReservation"}}}},
                "responses": {
                    "201": {"description": "Reservation created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Reservation"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"description": "Not authenticated"},
                    "409": {"description": "Insufficient seats or active reservation conflict"},
                    "404": {"description": "Trip not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            },
        },
        "/api/reservations/{reservation_id}/cancel": {
            "post": {
                "tags": ["Reservations"],
                "summary": "Cancel a reservation owned by the authenticated customer",
                "parameters": [{"$ref": "#/components/parameters/ReservationId"}],
                "responses": {
                    "200": {"description": "Cancelled reservation", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Reservation"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"description": "Not authenticated"},
                    "403": {"description": "Reservation belongs to another customer"},
                    "404": {"description": "Reservation not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/reservations/{reservation_id}/payments": {
            "post": {
                "tags": ["Payments"],
                "summary": "Simulate payment for a reservation",
                "parameters": [{"$ref": "#/components/parameters/ReservationId"}],
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreatePayment"}}}},
                "responses": {
                    "201": {"description": "Payment attempt recorded", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Payment"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"description": "Not authenticated"},
                    "403": {"description": "Reservation belongs to another customer"},
                    "404": {"description": "Reservation not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
        "/api/payments/{payment_id}/refund": {
            "post": {
                "tags": ["Payments"],
                "summary": "Refund a completed payment and cancel its reservation",
                "parameters": [{"$ref": "#/components/parameters/PaymentId"}],
                "responses": {
                    "200": {"description": "Refunded payment", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Payment"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"description": "Not authenticated"},
                    "403": {"description": "Payment belongs to another customer"},
                    "404": {"description": "Payment not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            }
        },
    },
    "components": {
        "parameters": {
            "ReservationId": {"name": "reservation_id", "in": "path", "required": True, "schema": {"type": "integer", "minimum": 1}},
            "PaymentId": {"name": "payment_id", "in": "path", "required": True, "schema": {"type": "integer", "minimum": 1}},
            "TripId": {"name": "trip_id", "in": "path", "required": True, "schema": {"type": "integer", "minimum": 1}},
            "DestinationId": {"name": "destination_id", "in": "path", "required": True, "schema": {"type": "integer", "minimum": 1}},
        },
        "schemas": {
            "RegisterRequest": {"type": "object", "required": ["first_name", "last_name", "email", "password", "password_confirm"], "properties": {"first_name": {"type": "string"}, "last_name": {"type": "string"}, "email": {"type": "string", "format": "email"}, "password": {"type": "string", "minLength": 8}, "password_confirm": {"type": "string"}}},
            "LoginRequest": {"type": "object", "required": ["email", "password"], "properties": {"email": {"type": "string", "format": "email"}, "password": {"type": "string"}}},
            "CustomerProfile": {"type": "object", "properties": {"id": {"type": "integer"}, "name": {"type": "string"}, "first_name": {"type": "string"}, "last_name": {"type": "string"}, "email": {"type": "string"}, "role": {"type": "string", "enum": ["customer", "admin"]}}},
            "Destination": {"type": "object", "properties": {"id": {"type": "integer"}, "name": {"type": "string"}, "country": {"type": "string"}, "description": {"type": "string"}}},
            "Trip": {"type": "object", "properties": {"id": {"type": "integer"}, "destination_id": {"type": "integer"}, "title": {"type": "string"}, "destination": {"type": "string"}, "country": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "price": {"type": "string", "example": "1299.00"}, "available_seats": {"type": "integer"}}},
            "TripWrite": {"type": "object", "required": ["title", "destination_id", "start_date", "end_date", "price", "available_seats"], "properties": {"title": {"type": "string", "maxLength": 200}, "destination_id": {"type": "integer", "minimum": 1}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "price": {"type": "number", "minimum": 0}, "available_seats": {"type": "integer", "minimum": 0}}},
            "Reservation": {"type": "object", "properties": {"id": {"type": "integer"}, "customer_id": {"type": "integer"}, "trip_id": {"type": "integer"}, "trip_title": {"type": "string"}, "destination": {"type": "string"}, "country": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "traveler_count": {"type": "integer"}, "status": {"type": "string", "enum": ["PENDING", "CONFIRMED", "CANCELLED"]}, "booking_date": {"type": "string", "format": "date-time"}, "total_price": {"type": "string"}, "payment": {"allOf": [{"$ref": "#/components/schemas/Payment"}], "nullable": True}}},
            "Payment": {"type": "object", "properties": {"id": {"type": "integer"}, "reservation_id": {"type": "integer"}, "amount": {"type": "string"}, "method": {"type": "string", "enum": ["CREDIT_CARD", "PAYPAL", "BANK_TRANSFER"]}, "status": {"type": "string", "enum": ["PENDING", "COMPLETED", "FAILED", "REFUNDED"]}}},
            "CreateReservation": {"type": "object", "required": ["trip_id"], "properties": {"trip_id": {"type": "integer", "minimum": 1}, "travelers": {"type": "integer", "minimum": 1, "default": 1}}},
            "CreatePayment": {"type": "object", "required": ["amount", "method"], "properties": {"amount": {"type": "number", "format": "double", "minimum": 0}, "method": {"type": "string", "enum": ["CREDIT_CARD", "PAYPAL", "BANK_TRANSFER"]}, "succeed": {"type": "boolean", "default": True}}},
            "Error": {"type": "object", "properties": {"error": {"type": "string"}}},
        },
        "responses": {
            "BadRequest": {"description": "Invalid input or business state", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
            "DatabaseUnavailable": {"description": "Database is unavailable; verify configuration and migrations", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
        },
    },
}


def create_api_blueprint(get_services, get_auth_service=None) -> Blueprint:
    """Build API routes using a callback that supplies the existing services."""
    api = Blueprint("trip_api", __name__, url_prefix="/api")

    @api.get("/openapi.json")
    def openapi_document():
        return jsonify(OPENAPI_SPEC)

    @api.get("/trips")
    @api.get("/trips/search")
    def list_trips():
        try:
            destination = request.args.get("destination") or None
            date_text = request.args.get("date")
            on_date = date.fromisoformat(date_text) if date_text else None
            departure_text = request.args.get("departure_date")
            departure_date = (
                date.fromisoformat(departure_text) if departure_text else None
            )
            return_text = request.args.get("return_date")
            return_date = date.fromisoformat(return_text) if return_text else None
            destination_id_text = request.args.get("destination_id")
            destination_id = (
                int(destination_id_text) if destination_id_text else None
            )
            if destination_id is not None and destination_id < 1:
                raise ValueError("destination_id must be a positive integer.")
            travelers_text = request.args.get("travelers", "1")
            travelers = int(travelers_text)
            max_price_text = request.args.get("max_price")
            max_price = Decimal(max_price_text) if max_price_text else None
            if max_price is not None and not max_price.is_finite():
                raise ValueError("Maximum price must be a finite number.")
            trips = get_services()[2].search_trips(
                destination,
                on_date,
                max_price,
                destination_id,
                departure_date,
                return_date,
                travelers,
            )
            return jsonify([trip_json(trip) for trip in trips])
        except (ValueError, InvalidOperation) as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("API trip search failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.get("/destinations")
    def list_destinations():
        try:
            destination_repository = get_services()[5]
            return jsonify(
                [
                    destination_json(destination)
                    for destination in destination_repository.get_all()
                ]
            )
        except SQLAlchemyError:
            logger.exception("API destination lookup failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.get("/destinations/<int:destination_id>")
    def get_destination(destination_id: int):
        try:
            destination = get_services()[5].get_by_id(destination_id)
            return jsonify(destination_json(destination))
        except KeyError:
            return error_response("Destination not found.", 404)
        except SQLAlchemyError:
            logger.exception("API destination lookup failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.post("/destinations")
    def create_destination():
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        try:
            values = _destination_values(body)
            destination = get_services()[5].add_with_auto_id(
                Destination(0, **values)
            )
            return jsonify(destination_json(destination)), 201
        except ValueError as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("Admin destination creation failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.put("/destinations/<int:destination_id>")
    def update_destination(destination_id: int):
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        try:
            values = _destination_values(body)
            repo = get_services()[5]
            destination = Destination(destination_id, **values)
            repo.update(destination)
            return jsonify(destination_json(destination))
        except KeyError:
            return error_response("Destination not found.", 404)
        except ValueError as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("Admin destination update failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.delete("/destinations/<int:destination_id>")
    def delete_destination(destination_id: int):
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        try:
            get_services()[5].delete(destination_id)
            return "", 204
        except KeyError:
            return error_response("Destination not found.", 404)
        except SQLAlchemyError:
            logger.exception("Admin destination deletion failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.post("/destinations/<int:destination_id>/image")
    def upload_destination_image(destination_id: int):
        """Accept a multipart image upload and persist the URL on the destination."""
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        if "image" not in request.files:
            return error_response("No image file in request.", 400)
        file = request.files["image"]
        if not file.filename:
            return error_response("File has no name.", 400)
        ext = Path(secure_filename(file.filename)).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            return error_response("Unsupported image type. Use JPG, PNG, WebP or GIF.", 400)
        uploads_dir = Path(
            current_app.config.get(
                "DESTINATION_UPLOAD_FOLDER",
                Path(current_app.root_path) / "static" / "uploads" / "destinations",
            )
        )
        try:
            uploads_dir.mkdir(parents=True, exist_ok=True)
            filename = f"{uuid.uuid4().hex}{ext}"
            file.save(uploads_dir / filename)
        except OSError:
            logger.exception("Destination image could not be saved")
            return error_response("The destination image could not be saved.", 500)

        image_url = f"/api/uploads/destinations/{filename}"
        try:
            repo = get_services()[5]
            # Update image_url directly — no need to pre-fetch the destination first
            with repo.database.session_scope() as session:
                model = session.get(DestinationModel, destination_id)
                if model is None:
                    logger.error("Destination id %s not found during image upload", destination_id)
                    return error_response("Destination not found.", 404)
                model.image_url = image_url
            return jsonify({"image_url": image_url}), 200
        except KeyError:
            logger.error("Destination id %s not found during image upload", destination_id)
            return error_response("Destination not found.", 404)
        except SQLAlchemyError:
            logger.exception("Image URL persistence failed")
            return error_response("Database unavailable.", 503)

    @api.get("/uploads/destinations/<path:filename>")
    def serve_destination_image(filename: str):
        """Serve uploaded destination images."""
        uploads_dir = Path(
            current_app.config.get(
                "DESTINATION_UPLOAD_FOLDER",
                Path(current_app.root_path) / "static" / "uploads" / "destinations",
            )
        )
        return send_from_directory(uploads_dir, filename)

    @api.get("/trips/<int:trip_id>")
    def get_trip(trip_id: int):
        try:
            trip = get_services()[2].trip_repository.get_by_id(trip_id)
            return jsonify(trip_json(trip))
        except KeyError:
            return error_response("Trip not found.", 404)
        except SQLAlchemyError:
            logger.exception("API trip lookup failed")
            return error_response(
                "Database unavailable; check configuration and migrations.", 503
            )

    @api.get("/admin/trips")
    def list_admin_trips():
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        try:
            trips = get_services()[2].list_all_trips()
            return jsonify([trip_json(trip) for trip in trips])
        except SQLAlchemyError:
            logger.exception("Admin trip listing failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/admin/trips")
    def create_admin_trip():
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        try:
            values = _admin_trip_values(body, get_services()[5])
            trip = get_services()[2].create_trip(admin, **values)
            return jsonify(trip_json(trip)), 201
        except KeyError:
            return error_response("Destination not found.", 404)
        except (ValueError, InvalidOperation) as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("Admin trip creation failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.put("/admin/trips/<int:trip_id>")
    def update_admin_trip(trip_id: int):
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        try:
            values = _admin_trip_values(body, get_services()[5])
            trip = get_services()[2].update_trip(admin, trip_id, **values)
            return jsonify(trip_json(trip))
        except KeyError as error:
            if "Destination" in str(error):
                return error_response("Destination not found.", 404)
            return error_response("Trip not found.", 404)
        except (ValueError, InvalidOperation) as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("Admin trip update failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.delete("/admin/trips/<int:trip_id>")
    def delete_admin_trip(trip_id: int):
        admin = _require_admin(get_services)
        if admin is None:
            return error_response("Administrator access required.", 403)
        try:
            get_services()[2].delete_trip(admin, trip_id)
            return "", 204
        except KeyError:
            return error_response("Trip not found.", 404)
        except ValueError as error:
            return error_response(str(error), 409)
        except SQLAlchemyError:
            logger.exception("Admin trip deletion failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.get("/reservations")
    def list_reservations():
        customer_id = _require_auth()
        if customer_id is None:
            return error_response("Authentication required.", 401)
        try:
            _customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            reservations = reservation_service.get_customer_reservations(customer_id)
            return jsonify([reservation_json(item) for item in reservations])
        except SQLAlchemyError:
            logger.exception("API reservation lookup failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/reservations")
    def create_reservation():
        customer_id = _require_auth()
        if customer_id is None:
            return error_response("Authentication required.", 401)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        if "trip_id" not in body:
            return error_response("trip_id is required.", 400)
        try:
            trip_id = positive_integer(body["trip_id"], "trip_id")
            travelers = positive_integer(body.get("travelers", 1), "travelers")
            _customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            customer_obj = reservation_service.customer_repository.get_by_id(customer_id)
            reservation = customer_obj.make_reservation(
                reservation_service, trip_id, travelers
            )
            return jsonify(reservation_json(reservation)), 201
        except KeyError:
            return error_response("Trip not found.", 404)
        except ReservationConflictError as error:
            return error_response(str(error), 409)
        except ValueError as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("API reservation creation failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/reservations/<int:reservation_id>/cancel")
    def cancel_reservation(reservation_id: int):
        customer_id = _require_auth()
        if customer_id is None:
            return error_response("Authentication required.", 401)
        try:
            _customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            customer_obj = reservation_service.customer_repository.get_by_id(customer_id)
            reservation = customer_obj.cancel_reservation(
                reservation_service, reservation_id
            )
            return jsonify(reservation_json(reservation))
        except KeyError:
            return error_response("Reservation not found.", 404)
        except PermissionError as error:
            return error_response(str(error), 403)
        except ValueError as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("API reservation cancellation failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/reservations/<int:reservation_id>/payments")
    def create_payment(reservation_id: int):
        customer_id = _require_auth()
        if customer_id is None:
            return error_response("Authentication required.", 401)
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        method_name = body.get("method")
        if not isinstance(method_name, str) or method_name not in PaymentMethod.__members__:
            return error_response(
                "method must be CREDIT_CARD, PAYPAL, or BANK_TRANSFER.", 400
            )
        if "amount" not in body:
            return error_response("amount is required.", 400)
        try:
            method = PaymentMethod[method_name]
            amount = Decimal(str(body["amount"]))
            if not amount.is_finite():
                return error_response("amount must be a finite number.", 400)
            if "succeed" in body and not isinstance(body["succeed"], bool):
                return error_response("succeed must be a boolean.", 400)
            payment = get_services()[4].process_payment(
                reservation_id,
                amount,
                method,
                succeed=body.get("succeed", True),
                customer_id=customer_id,
            )
            return jsonify(payment_json(payment)), 201
        except KeyError as error:
            return error_response("Reservation not found.", 404)
        except PermissionError as error:
            return error_response(str(error), 403)
        except (ValueError, InvalidOperation) as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("API payment processing failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/payments/<int:payment_id>/refund")
    def refund_payment(payment_id: int):
        customer_id = _require_auth()
        if customer_id is None:
            return error_response("Authentication required.", 401)
        try:
            payment = get_services()[4].refund_payment(
                payment_id, customer_id
            )
            return jsonify(payment_json(payment))
        except KeyError:
            return error_response("Payment not found.", 404)
        except PermissionError as error:
            return error_response(str(error), 403)
        except ValueError as error:
            return error_response(str(error), 400)
        except SQLAlchemyError:
            logger.exception("API refund failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    return api


def _require_auth() -> int | None:
    """Return the session customer_id or None if not authenticated."""
    return session.get(SESSION_CUSTOMER_ID_KEY)


def _require_admin(get_services) -> Admin | None:
    """Resolve the signed-in administrator from the session and database."""
    admin_id = session.get(SESSION_ADMIN_ID_KEY)
    if not admin_id:
        return None
    try:
        user = get_services()[2].user_repository.get_user_by_id(admin_id)
    except KeyError:
        session.clear()
        return None
    return user if isinstance(user, Admin) else None


def _admin_trip_values(body: dict, destination_repository) -> dict:
    """Validate and resolve the complete editable trip payload."""
    title = body.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("title is required.")
    if len(title.strip()) > 200:
        raise ValueError("title must be 200 characters or fewer.")
    destination_id = positive_integer(body.get("destination_id"), "destination_id")
    try:
        start_date = date.fromisoformat(body.get("start_date", ""))
        end_date = date.fromisoformat(body.get("end_date", ""))
    except (TypeError, ValueError) as error:
        raise ValueError("start_date and end_date must be valid ISO dates.") from error
    try:
        price = Decimal(str(body.get("price", "")))
    except InvalidOperation as error:
        raise ValueError("price must be a valid number.") from error
    if not price.is_finite() or price < 0:
        raise ValueError("price must be a finite, non-negative number.")
    seats = body.get("available_seats")
    if isinstance(seats, bool) or not isinstance(seats, int) or seats < 0:
        raise ValueError("available_seats must be a non-negative integer.")
    return {
        "title": title.strip(),
        "start_date": start_date,
        "end_date": end_date,
        "price": price,
        "available_seats": seats,
        "destination": destination_repository.get_by_id(destination_id),
    }


def trip_json(trip: Trip) -> dict:
    """Serialize a domain trip to a JSON-safe document."""
    return {
        "id": trip.id,
        "destination_id": trip.destination.id,
        "title": trip.title,
        "destination": trip.destination.name,
        "country": trip.destination.country,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "price": str(trip.price),
        "available_seats": trip.available_seats,
    }


def destination_json(destination: Destination) -> dict:
    """Serialize a destination without presentation-only mock fields."""
    return {
        "id": destination.id,
        "name": destination.name,
        "country": destination.country,
        "description": destination.description,
        "image_url": destination.image_url or "",
    }


def reservation_json(reservation: Reservation) -> dict:
    """Serialize a domain reservation including its optional payment."""
    return {
        "id": reservation.id,
        "customer_id": reservation.customer.id,
        "trip_id": reservation.trip.id,
        "trip_title": reservation.trip.title,
        "destination": reservation.trip.destination.name,
        "country": reservation.trip.destination.country,
        "start_date": reservation.trip.start_date.isoformat(),
        "end_date": reservation.trip.end_date.isoformat(),
        "traveler_count": reservation.traveler_count,
        "status": reservation.status.name,
        "booking_date": reservation.booking_date.isoformat(),
        "total_price": str(reservation.total_price),
        "payment": payment_json(reservation.payment) if reservation.payment else None,
    }


def payment_json(payment: Payment) -> dict:
    """Serialize a domain payment."""
    return {
        "id": payment.id,
        "reservation_id": payment.reservation.id,
        "amount": str(payment.amount),
        "method": payment.method.name,
        "status": payment.status.name,
    }


def error_response(message: str, status: int):
    """Return a consistent JSON error response."""
    return jsonify({"error": message}), status


def positive_integer(value, field_name: str) -> int:
    """Validate integer JSON fields without accepting booleans or fractions."""
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{field_name} must be a positive integer.")
    return value


def _destination_values(body: dict) -> dict:
    """Validate and return the editable destination payload."""
    name = body.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("name is required.")
    if len(name.strip()) > 120:
        raise ValueError("name must be 120 characters or fewer.")
    country = body.get("country")
    if not isinstance(country, str) or not country.strip():
        raise ValueError("country is required.")
    if len(country.strip()) > 120:
        raise ValueError("country must be 120 characters or fewer.")
    description = str(body.get("description", "")).strip()
    return {
        "name": name.strip(),
        "country": country.strip(),
        "description": description,
    }