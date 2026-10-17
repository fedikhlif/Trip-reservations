"""OpenAPI-described JSON endpoints backed by the existing application services."""

from datetime import date
from decimal import Decimal, InvalidOperation
import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from domain.destination import Destination
from domain.enums import PaymentMethod
from domain.payment import Payment
from domain.reservation import Reservation
from domain.trip import Trip
from services.reservation_service import ReservationConflictError

logger = logging.getLogger(__name__)

OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "Trip Reservation API",
        "version": "1.0.0",
        "description": "Local demo API. Uses the seeded customer Jordan Lee.",
    },
    "servers": [{"url": "http://127.0.0.1:8082"}],
    "tags": [
        {"name": "Trips"},
        {"name": "Destinations"},
        {"name": "Reservations"},
        {"name": "Payments"},
    ],
    "paths": {
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
                    "200": {
                        "description": "Available trips",
                        "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Trip"}}}},
                    },
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
        "/api/reservations": {
            "get": {
                "tags": ["Reservations"],
                "summary": "List demo customer reservations",
                "responses": {
                    "200": {"description": "Reservation history", "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/Reservation"}}}}},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            },
            "post": {
                "tags": ["Reservations"],
                "summary": "Reserve seats for the demo customer",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateReservation"}}}},
                "responses": {
                    "201": {"description": "Reservation created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Reservation"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "409": {"description": "Insufficient seats or active reservation conflict"},
                    "404": {"description": "Trip not found"},
                    "503": {"$ref": "#/components/responses/DatabaseUnavailable"},
                },
            },
        },
        "/api/reservations/{reservation_id}/cancel": {
            "post": {
                "tags": ["Reservations"],
                "summary": "Cancel a reservation owned by the demo customer",
                "parameters": [{"$ref": "#/components/parameters/ReservationId"}],
                "responses": {
                    "200": {"description": "Cancelled reservation", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Reservation"}}}},
                    "400": {"$ref": "#/components/responses/BadRequest"},
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
            "Destination": {"type": "object", "properties": {"id": {"type": "integer"}, "name": {"type": "string"}, "country": {"type": "string"}, "description": {"type": "string"}}},
            "Trip": {"type": "object", "properties": {"id": {"type": "integer"}, "destination_id": {"type": "integer"}, "title": {"type": "string"}, "destination": {"type": "string"}, "country": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "price": {"type": "string", "example": "1299.00"}, "available_seats": {"type": "integer"}}},
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


def create_api_blueprint(get_services) -> Blueprint:
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

    @api.get("/reservations")
    def list_reservations():
        try:
            customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            reservations = customer.view_reservations(reservation_service)
            return jsonify([reservation_json(item) for item in reservations])
        except SQLAlchemyError:
            logger.exception("API reservation lookup failed")
            return error_response("Database unavailable; check configuration and migrations.", 503)

    @api.post("/reservations")
    def create_reservation():
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return error_response("Request body must be a JSON object.", 400)
        if "trip_id" not in body:
            return error_response("trip_id is required.", 400)
        try:
            trip_id = positive_integer(body["trip_id"], "trip_id")
            travelers = positive_integer(body.get("travelers", 1), "travelers")
            customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            reservation = customer.make_reservation(
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
        try:
            customer, _admin, _trips, reservation_service, _payments, _destinations = get_services()
            reservation = customer.cancel_reservation(
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
            customer = get_services()[0]
            payment = get_services()[4].process_payment(
                reservation_id,
                amount,
                method,
                succeed=body.get("succeed", True),
                customer_id=customer.id,
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
        try:
            customer = get_services()[0]
            payment = get_services()[4].refund_payment(
                payment_id, customer.id
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