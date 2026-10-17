"""Tests for the localhost Flask interface using isolated SQLite storage."""

from domain.customer import Customer
from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from database import Database
from sqlalchemy import inspect
from tests.support import SQLiteTestCase
from web_app import create_app
from pathlib import Path
import tempfile


class WebAppTests(SQLiteTestCase):
    """Exercise browser routes without requiring a MySQL server."""

    def setUp(self) -> None:
        super().setUp()
        self.app = create_app(self.database)
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()

    def test_homepage_and_health_route_render(self) -> None:
        response = self.client.get("/")
        self.assertEqual(200, response.status_code)
        self.assertIn(b"Available journeys", response.data)
        self.assertIn(b"Kyoto in Bloom", response.data)
        self.assertIn(b"Swagger API", response.data)
        self.assertEqual({"status": "ok", "database": "checked on page request"},
                         self.client.get("/health").get_json())

    def test_browser_can_book_pay_refund_and_cancel(self) -> None:
        self.client.get("/")
        booking_response = self.client.post(
            "/reservations", data={"trip_id": "1"}, follow_redirects=True
        )
        self.assertEqual(200, booking_response.status_code)
        services = self.app.extensions["trip_services"]
        reservation = services[3].get_customer_reservations(1)[0]
        self.assertEqual(ReservationStatus.PENDING, reservation.status)
        self.assertEqual(7, services[2].trip_repository.get_by_id(1).available_seats)

        payment_response = self.client.post(
            f"/reservations/{reservation.id}/pay",
            data={
                "amount": "1299.00",
                "method": "CREDIT_CARD",
                "outcome": "succeed",
            },
            follow_redirects=True,
        )
        self.assertEqual(200, payment_response.status_code)
        completed = services[3].get_customer_reservations(1)[0]
        self.assertEqual(ReservationStatus.CONFIRMED, completed.status)
        self.assertEqual(PaymentStatus.COMPLETED, completed.payment.status)

        refund_response = self.client.post(
            f"/payments/{completed.payment.id}/refund", follow_redirects=True
        )
        self.assertEqual(200, refund_response.status_code)
        refunded = services[3].get_customer_reservations(1)[0]
        self.assertEqual(ReservationStatus.CANCELLED, refunded.status)
        self.assertEqual(PaymentStatus.REFUNDED, refunded.payment.status)
        self.assertEqual(8, services[2].trip_repository.get_by_id(1).available_seats)

    def test_invalid_mysql_connection_shows_friendly_page(self) -> None:
        from unittest.mock import patch

        from sqlalchemy.exc import OperationalError

        with patch("web_app.build_application", side_effect=OperationalError(
            "connect", {}, Exception("credentials"))):
            app = create_app(self.database)
            app.config.update(TESTING=True)
            response = app.test_client().get("/")
        self.assertEqual(503, response.status_code)
        self.assertIn(b"Database connection unavailable", response.data)

    def test_swagger_ui_and_openapi_document_are_served_locally(self) -> None:
        ui_response = self.client.get("/api/docs/")
        spec_response = self.client.get("/api/openapi.json")
        self.assertEqual(200, ui_response.status_code)
        self.assertIn(b"swagger-ui", ui_response.data.lower())
        self.assertEqual(200, spec_response.status_code)
        self.assertEqual("3.0.3", spec_response.get_json()["openapi"])
        self.assertIn("/api/reservations/{reservation_id}/payments",
                      spec_response.get_json()["paths"])

    def test_json_api_can_list_reserve_pay_and_refund(self) -> None:
        trips_response = self.client.get("/api/trips")
        self.assertEqual(200, trips_response.status_code)
        self.assertEqual(3, len(trips_response.get_json()))

        reservation_response = self.client.post(
            "/api/reservations", json={"trip_id": 1}
        )
        self.assertEqual(201, reservation_response.status_code)
        reservation_id = reservation_response.get_json()["id"]

        payment_response = self.client.post(
            f"/api/reservations/{reservation_id}/payments",
            json={"amount": "1299.00", "method": "PAYPAL", "succeed": True},
        )
        self.assertEqual(201, payment_response.status_code)
        self.assertEqual("COMPLETED", payment_response.get_json()["status"])
        payment_id = payment_response.get_json()["id"]

        refund_response = self.client.post(f"/api/payments/{payment_id}/refund")
        self.assertEqual(200, refund_response.status_code)
        self.assertEqual("REFUNDED", refund_response.get_json()["status"])

    def test_json_api_validates_input(self) -> None:
        response = self.client.post("/api/reservations", json={})
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            400,
            self.client.post(
                "/api/reservations", json={"trip_id": 1, "travelers": True}
            ).status_code,
        )
        self.assertEqual(
            400,
            self.client.post("/api/reservations", json=[1]).status_code,
        )
        response = self.client.post(
            "/api/reservations/1/payments",
            json={"amount": 1, "method": "BITCOIN"},
        )
        self.assertEqual(400, response.status_code)
        self.assertEqual(
            400,
            self.client.post(
                "/api/reservations/1/payments", json={"method": []}
            ).status_code,
        )

    def test_api_lists_destinations_and_searches_with_real_filters(self) -> None:
        destinations = self.client.get("/api/destinations")
        self.assertEqual(200, destinations.status_code)
        self.assertEqual("Kyoto", destinations.get_json()[0]["name"])
        self.assertEqual(
            200, self.client.get("/api/destinations/1").status_code
        )
        self.assertEqual(404, self.client.get("/api/destinations/404").status_code)

        trip = self.app.extensions["trip_services"][2].trip_repository.get_by_id(1)
        self.assertEqual(200, self.client.get("/api/trips/1").status_code)
        self.assertEqual(404, self.client.get("/api/trips/404").status_code)
        results = self.client.get(
            "/api/trips/search",
            query_string={
                "destination_id": 1,
                "departure_date": trip.start_date.isoformat(),
                "return_date": trip.end_date.isoformat(),
                "travelers": 2,
            },
        )
        self.assertEqual(200, results.status_code)
        self.assertEqual([1], [item["id"] for item in results.get_json()])
        self.assertEqual(
            400,
            self.client.get(
                "/api/trips/search",
                query_string={
                    "departure_date": trip.end_date.isoformat(),
                    "return_date": trip.start_date.isoformat(),
                },
            ).status_code,
        )

    def test_api_reserves_group_capacity_and_returns_conflict_when_unavailable(self) -> None:
        response = self.client.post(
            "/api/reservations", json={"trip_id": 1, "travelers": 3}
        )
        self.assertEqual(201, response.status_code)
        self.assertEqual(3, response.get_json()["traveler_count"])
        self.assertEqual("3897.00", response.get_json()["total_price"])

        conflict = self.client.post(
            "/api/reservations", json={"trip_id": 1, "travelers": 6}
        )
        self.assertEqual(409, conflict.status_code)

    def test_api_cors_is_limited_to_configured_frontend_origin(self) -> None:
        allowed = self.client.get(
            "/api/destinations", headers={"Origin": "http://localhost:4200"}
        )
        self.assertEqual(
            "http://localhost:4200",
            allowed.headers["Access-Control-Allow-Origin"],
        )
        denied = self.client.get(
            "/api/destinations", headers={"Origin": "https://untrusted.example"}
        )
        self.assertNotIn("Access-Control-Allow-Origin", denied.headers)
        preflight = self.client.options(
            "/api/destinations",
            headers={"Origin": "http://localhost:4200"},
        )
        self.assertEqual(204, preflight.status_code)
        self.assertEqual(
            "GET, POST, OPTIONS",
            preflight.headers["Access-Control-Allow-Methods"],
        )

    def test_api_rejects_mutations_of_another_customers_reservation(self) -> None:
        self.client.get("/api/trips")
        _customer, _admin, trip_service, reservation_service, payment_service, _destinations = (
            self.app.extensions["trip_services"]
        )
        other_customer = Customer(
            42, "Other Customer", "other@example.test", "demo-hash"
        )
        trip_service.user_repository.add(other_customer)
        reservation = reservation_service.create_reservation(
            other_customer, 1
        )

        self.assertEqual(
            403,
            self.client.post(
                f"/api/reservations/{reservation.id}/cancel"
            ).status_code,
        )
        self.assertEqual(
            403,
            self.client.post(
                f"/api/reservations/{reservation.id}/payments",
                json={"amount": str(reservation.total_price), "method": "PAYPAL"},
            ).status_code,
        )

        payment = payment_service.process_payment(
            reservation.id,
            reservation.total_price,
            PaymentMethod.PAYPAL,
        )
        self.assertEqual(
            403,
            self.client.post(
                f"/api/payments/{payment.id}/refund"
            ).status_code,
        )

    def test_first_web_request_applies_migrations_automatically(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database_path = Path(directory) / "startup.db"
            database = Database(
                f"sqlite+pysqlite:///{database_path.as_posix()}"
            )
            app = create_app(database)
            app.config.update(TESTING=True, AUTO_MIGRATE=True)
            try:
                response = app.test_client().get("/")
                self.assertEqual(200, response.status_code)
                self.assertEqual(
                    {
                        "alembic_version",
                        "users",
                        "destinations",
                        "trips",
                        "reservations",
                        "payments",
                    },
                    set(inspect(database.engine).get_table_names()),
                )
            finally:
                database.dispose()


if __name__ == "__main__":
    import unittest

    unittest.main()