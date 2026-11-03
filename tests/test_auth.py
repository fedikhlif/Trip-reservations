"""Tests for registration, login, session management, and authorization."""

from argon2 import PasswordHasher

from database import Database
from services.auth_service import AuthService, DuplicateEmailError
from tests.support import SQLiteTestCase
from web_app import create_app


class AuthApiTests(SQLiteTestCase):
    """Test the /api/auth/* endpoints and session-guarded reservation endpoints."""

    def setUp(self) -> None:
        super().setUp()
        self.app = create_app(self.database)
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()
        # Ensure services are seeded before auth endpoints are used.
        self.client.get("/api/trips")

    # ── Registration ──────────────────────────────────────────────────────────

    def test_register_creates_account_and_returns_profile(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Alice",
                "last_name": "Martin",
                "email": "alice@example.com",
                "password": "Secure1234",
                "password_confirm": "Secure1234",
            },
        )
        self.assertEqual(201, response.status_code)
        data = response.get_json()
        self.assertEqual("Alice", data["first_name"])
        self.assertEqual("Martin", data["last_name"])
        self.assertEqual("alice@example.com", data["email"])
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

    def test_register_hashes_password_not_plaintext(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Bob",
                "last_name": "Test",
                "email": "bob@example.com",
                "password": "MyPassword8",
                "password_confirm": "MyPassword8",
            },
        )
        # Retrieve the stored hash via repository
        services = self.app.extensions["trip_services"]
        reservation_service = services[3]
        customer = reservation_service.customer_repository.get_by_email("bob@example.com")
        ph = PasswordHasher()
        self.assertTrue(ph.verify(customer.password_hash, "MyPassword8"))
        self.assertNotEqual("MyPassword8", customer.password_hash)

    def test_register_rejects_duplicate_email(self) -> None:
        payload = {
            "first_name": "Carol",
            "last_name": "Doe",
            "email": "carol@example.com",
            "password": "Password12",
            "password_confirm": "Password12",
        }
        self.client.post("/api/auth/register", json=payload)
        second = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(409, second.status_code)

    def test_register_rejects_mismatched_passwords(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Dave",
                "last_name": "Test",
                "email": "dave@example.com",
                "password": "Password12",
                "password_confirm": "Different99",
            },
        )
        self.assertEqual(400, response.status_code)

    def test_register_rejects_short_password(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Eva",
                "last_name": "Test",
                "email": "eva@example.com",
                "password": "short",
                "password_confirm": "short",
            },
        )
        self.assertEqual(400, response.status_code)

    def test_register_rejects_invalid_email(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Frank",
                "last_name": "Test",
                "email": "not-an-email",
                "password": "Password12",
                "password_confirm": "Password12",
            },
        )
        self.assertEqual(400, response.status_code)

    def test_register_rejects_missing_required_fields(self) -> None:
        response = self.client.post("/api/auth/register", json={"email": "x@x.com"})
        self.assertEqual(400, response.status_code)

    # ── Login ─────────────────────────────────────────────────────────────────

    def _register_and_login(self, email: str = "test@example.com", password: str = "TestPass99") -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": email,
                "password": password,
                "password_confirm": password,
            },
        )
        self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )

    def test_login_with_valid_credentials_returns_profile(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Grace",
                "last_name": "Test",
                "email": "grace@example.com",
                "password": "GracePass1",
                "password_confirm": "GracePass1",
            },
        )
        response = self.client.post(
            "/api/auth/login",
            json={"email": "grace@example.com", "password": "GracePass1"},
        )
        self.assertEqual(200, response.status_code)
        data = response.get_json()
        self.assertEqual("Grace", data["first_name"])
        self.assertEqual("customer", data["role"])
        self.assertNotIn("password_hash", data)

    def test_admin_can_log_in_and_manage_trips(self) -> None:
        auth_service = AuthService(self.customer_repository)
        admin = auth_service.provision_admin(
            "Taylor Admin", "taylor-admin@example.com", "AdminPass123"
        )
        login = self.client.post(
            "/api/auth/login",
            json={"email": admin.email, "password": "AdminPass123"},
        )
        self.assertEqual(200, login.status_code)
        self.assertEqual("admin", login.get_json()["role"])
        self.assertEqual("admin", self.client.get("/api/auth/me").get_json()["role"])

        listing = self.client.get("/api/admin/trips")
        self.assertEqual(200, listing.status_code)
        self.assertIn(self.trip.id, [trip["id"] for trip in listing.get_json()])

        created = self.client.post(
            "/api/admin/trips",
            json={
                "title": "Admin-created trip",
                "destination_id": self.destination.id,
                "start_date": "2030-06-01",
                "end_date": "2030-06-05",
                "price": "250.00",
                "available_seats": 12,
            },
        )
        self.assertEqual(201, created.status_code)
        trip_id = created.get_json()["id"]
        self.assertGreater(trip_id, 0)

        updated = self.client.put(
            f"/api/admin/trips/{trip_id}",
            json={
                "title": "Updated admin trip",
                "destination_id": self.destination.id,
                "start_date": "2030-06-02",
                "end_date": "2030-06-06",
                "price": "275.50",
                "available_seats": 10,
            },
        )
        self.assertEqual(200, updated.status_code)
        self.assertEqual("Updated admin trip", updated.get_json()["title"])

        deleted = self.client.delete(f"/api/admin/trips/{trip_id}")
        self.assertEqual(204, deleted.status_code)
        self.assertEqual(404, self.client.get(f"/api/trips/{trip_id}").status_code)

    def test_customer_cannot_manage_trips(self) -> None:
        self._register_and_login()
        self.assertEqual(403, self.client.get("/api/admin/trips").status_code)
        response = self.client.post(
            "/api/admin/trips",
            json={
                "title": "Forbidden trip",
                "destination_id": self.destination.id,
                "start_date": "2030-06-01",
                "end_date": "2030-06-05",
                "price": "250.00",
                "available_seats": 2,
            },
        )
        self.assertEqual(403, response.status_code)

    def test_admin_creation_rejects_duplicate_customer_email(self) -> None:
        with self.assertRaises(DuplicateEmailError):
            AuthService(self.customer_repository).provision_admin(
                "Duplicate", "riley@example.com", "AdminPass123"
            )

    def test_admin_provisioning_resets_existing_admin_password(self) -> None:
        auth_service = AuthService(self.customer_repository)
        admin = auth_service.provision_admin(
            "Taylor Admin", "taylor-admin@example.com", "AdminPass123"
        )
        updated = auth_service.provision_admin(
            "Taylor Admin", admin.email, "NewAdminPass456"
        )
        self.assertEqual(admin.id, updated.id)
        login = self.client.post(
            "/api/auth/login",
            json={"email": admin.email, "password": "NewAdminPass456"},
        )
        self.assertEqual(200, login.status_code)
        self.assertEqual("admin", login.get_json()["role"])

    def test_login_rejects_wrong_password(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Hank",
                "last_name": "Test",
                "email": "hank@example.com",
                "password": "HankPass1",
                "password_confirm": "HankPass1",
            },
        )
        response = self.client.post(
            "/api/auth/login",
            json={"email": "hank@example.com", "password": "WrongPassword"},
        )
        self.assertEqual(401, response.status_code)

    def test_login_rejects_nonexistent_email(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "Whatever1"},
        )
        self.assertEqual(401, response.status_code)

    # ── Session ───────────────────────────────────────────────────────────────

    def test_me_returns_profile_when_logged_in(self) -> None:
        self._register_and_login()
        response = self.client.get("/api/auth/me")
        self.assertEqual(200, response.status_code)
        self.assertEqual("test@example.com", response.get_json()["email"])

    def test_me_returns_401_when_not_logged_in(self) -> None:
        response = self.client.get("/api/auth/me")
        self.assertEqual(401, response.status_code)

    def test_logout_clears_session(self) -> None:
        self._register_and_login()
        self.assertEqual(200, self.client.get("/api/auth/me").status_code)
        self.client.post("/api/auth/logout")
        self.assertEqual(401, self.client.get("/api/auth/me").status_code)

    # ── Reservation authorization ─────────────────────────────────────────────

    def test_reservations_require_authentication(self) -> None:
        response = self.client.get("/api/reservations")
        self.assertEqual(401, response.status_code)

    def test_authenticated_customer_can_list_their_reservations(self) -> None:
        self._register_and_login()
        response = self.client.get("/api/reservations")
        self.assertEqual(200, response.status_code)
        self.assertIsInstance(response.get_json(), list)

    def test_authenticated_customer_can_create_reservation(self) -> None:
        self._register_and_login()
        response = self.client.post("/api/reservations", json={"trip_id": 1})
        self.assertEqual(201, response.status_code)
        data = response.get_json()
        self.assertEqual("PENDING", data["status"])

    def test_customer_cannot_access_another_customers_reservation(self) -> None:
        """Customer A creates a reservation; Customer B cannot cancel or pay for it."""
        # Register Customer A and make a reservation.
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Alpha",
                "last_name": "User",
                "email": "alpha@example.com",
                "password": "AlphaPass1",
                "password_confirm": "AlphaPass1",
            },
        )
        self.client.post(
            "/api/auth/login",
            json={"email": "alpha@example.com", "password": "AlphaPass1"},
        )
        reservation_resp = self.client.post(
            "/api/reservations", json={"trip_id": 1}
        )
        reservation_id = reservation_resp.get_json()["id"]

        # Register and login as Customer B.
        self.client.post("/api/auth/logout")
        self.client.post(
            "/api/auth/register",
            json={
                "first_name": "Beta",
                "last_name": "User",
                "email": "beta@example.com",
                "password": "BetaPass12",
                "password_confirm": "BetaPass12",
            },
        )
        self.client.post(
            "/api/auth/login",
            json={"email": "beta@example.com", "password": "BetaPass12"},
        )

        # Beta must not be able to cancel Alpha's reservation.
        cancel_resp = self.client.post(f"/api/reservations/{reservation_id}/cancel")
        self.assertEqual(403, cancel_resp.status_code)

        # Beta must not be able to pay for Alpha's reservation.
        pay_resp = self.client.post(
            f"/api/reservations/{reservation_id}/payments",
            json={"amount": "1299.00", "method": "CREDIT_CARD"},
        )
        self.assertEqual(403, pay_resp.status_code)

    def test_unauthenticated_user_cannot_create_reservation(self) -> None:
        response = self.client.post("/api/reservations", json={"trip_id": 1})
        self.assertEqual(401, response.status_code)


if __name__ == "__main__":
    import unittest
    unittest.main()
