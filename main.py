"""Command-line interface for the trip reservation system."""

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from sqlalchemy.exc import SQLAlchemyError

from database import Database, upgrade_schema
from domain.admin import Admin
from domain.customer import Customer
from domain.destination import Destination
from domain.enums import PaymentMethod
from domain.trip import Trip
from repositories.customer_repository import CustomerRepository
from repositories.destination_repository import DestinationRepository
from repositories.payment_repository import PaymentRepository
from repositories.reservation_repository import ReservationRepository
from repositories.trip_repository import TripRepository
from services.payment_service import PaymentService
from services.reservation_service import ReservationService
from services.trip_service import TripService


def build_application(
    database: Database | None = None,
) -> tuple[
    Customer,
    Admin,
    TripService,
    ReservationService,
    PaymentService,
    DestinationRepository,
]:
    """Wire repositories and services to the configured, migrated database."""
    database = database or Database()

    customer_repository = CustomerRepository(database)
    destination_repository = DestinationRepository(database)
    trip_repository = TripRepository(database, destination_repository)
    reservation_repository = ReservationRepository(
        database, customer_repository, trip_repository
    )
    payment_repository = PaymentRepository(database, reservation_repository)

    customer = Customer(1, "Jordan Lee", "jordan@example.com", "demo-hash-customer")
    admin = Admin(2, "Morgan Admin", "admin@example.com", "demo-hash-admin")
    try:
        customer = customer_repository.get_by_id(customer.id)
    except KeyError:
        customer_repository.add(customer)
    try:
        customer_repository.get_user_by_id(admin.id)
    except KeyError:
        customer_repository.add_admin(admin)
    else:
        admin = Admin(admin.id, admin.name, admin.email, admin.password_hash)

    destinations = [
        Destination(
            1, "Kyoto", "Japan", "Temples, gardens, and traditional streets."
        ),
        Destination(
            2, "Reykjavik", "Iceland", "A gateway to Iceland's natural wonders."
        ),
    ]
    for destination in destinations:
        try:
            destination_repository.get_by_id(destination.id)
        except KeyError:
            destination_repository.add(destination)

    first_day = date.today() + timedelta(days=30)
    sample_trips = [
        Trip(
            1, "Kyoto in Bloom", first_day, first_day + timedelta(days=5),
            Decimal("1299.00"), 8, destinations[0]
        ),
        Trip(
            2, "Icelandic Horizons", first_day + timedelta(days=14),
            first_day + timedelta(days=20), Decimal("1849.50"), 5, destinations[1]
        ),
    ]
    for trip in sample_trips:
        try:
            trip_repository.get_by_id(trip.id)
        except KeyError:
            trip_repository.add(trip)

    trip_service = TripService(trip_repository, customer_repository)
    reservation_service = ReservationService(
        reservation_repository, customer_repository, trip_repository
    )
    payment_service = PaymentService(
        payment_repository, reservation_repository, reservation_service
    )
    return (
        customer,
        admin,
        trip_service,
        reservation_service,
        payment_service,
        destination_repository,
    )


def read_int(prompt: str) -> int:
    """Read an integer from the user with a concise error message."""
    return int(input(prompt).strip())


def read_decimal(prompt: str) -> Decimal:
    """Read a decimal amount from the user."""
    return Decimal(input(prompt).strip())


def display_trips(trips: list[Trip]) -> None:
    """Print a readable trip list."""
    if not trips:
        print("No trips matched your request.")
        return
    for trip in trips:
        print(
            f"#{trip.id} {trip.title} | {trip.destination.name}, "
            f"{trip.destination.country} | {trip.start_date} to {trip.end_date} | "
            f"${trip.price:.2f} | {trip.available_seats} seat(s)"
        )


def customer_menu(
    customer: Customer,
    trip_service: TripService,
    reservation_service: ReservationService,
    payment_service: PaymentService,
) -> None:
    """Run the customer menu until the user chooses to return."""
    while True:
        print("\nCustomer menu: 1 Trips  2 Search  3 Reserve  4 Reservations")
        print("               5 Cancel  6 Pay  7 Refund  8 Exit")
        try:
            choice = read_int("Choose an option: ")
            if choice == 1:
                display_trips(trip_service.list_available_trips())
            elif choice == 2:
                destination = (
                    input("Destination or country (blank to skip): ").strip() or None
                )
                date_text = input("Date YYYY-MM-DD (blank to skip): ").strip()
                on_date = date.fromisoformat(date_text) if date_text else None
                price_text = input("Maximum price (blank to skip): ").strip()
                max_price = Decimal(price_text) if price_text else None
                display_trips(
                    trip_service.search_trips(destination, on_date, max_price)
                )
            elif choice == 3:
                reservation = customer.make_reservation(
                    reservation_service, read_int("Trip ID: ")
                )
                print(
                    f"Reservation #{reservation.id} created. "
                    f"Total: ${reservation.total_price:.2f}."
                )
            elif choice == 4:
                reservations = customer.view_reservations(reservation_service)
                if not reservations:
                    print("You have no reservations.")
                for reservation in reservations:
                    print(
                        f"#{reservation.id} {reservation.trip.title} | "
                        f"{reservation.status.name} | ${reservation.total_price:.2f}"
                    )
            elif choice == 5:
                reservation = customer.cancel_reservation(
                    reservation_service, read_int("Reservation ID: ")
                )
                print(f"Reservation #{reservation.id} cancelled.")
            elif choice == 6:
                reservation_id = read_int("Reservation ID: ")
                method_options = list(PaymentMethod)
                for index, method in enumerate(method_options, start=1):
                    print(f"{index}. {method.name.replace('_', ' ').title()}")
                method_index = read_int("Payment method: ")
                method = method_options[method_index - 1]
                succeed = input("Simulate success? [Y/n]: ").strip().casefold() != "n"
                payment = payment_service.process_payment(
                    reservation_id,
                    read_decimal("Payment amount: "),
                    method,
                    succeed=succeed,
                )
                print(f"Simulated payment #{payment.id}: {payment.status.name}.")
            elif choice == 7:
                payment = payment_service.refund_payment(
                    read_int("Payment ID: ")
                )
                print(f"Payment #{payment.id} refunded; reservation cancelled.")
            elif choice == 8:
                return
            else:
                print("Choose a number from 1 to 8.")
        except (
            ValueError,
            KeyError,
            PermissionError,
            IndexError,
            InvalidOperation,
            SQLAlchemyError,
        ) as error:
            print(f"Could not complete that action: {error}")


def admin_menu(
    admin: Admin,
    trip_service: TripService,
    destination_repository: DestinationRepository,
) -> None:
    """Run the administrator menu until the user chooses to return."""
    destinations = {
        destination.id: destination for destination in destination_repository.get_all()
    }
    while True:
        print("\nAdmin menu: 1 Add trip  2 Update trip  3 Delete trip")
        print("            4 View all trips  5 Exit")
        try:
            choice = read_int("Choose an option: ")
            if choice == 1:
                display_destinations = ", ".join(
                    f"{destination_id}: {destination.name}"
                    for destination_id, destination in destinations.items()
                )
                print(f"Destinations: {display_destinations}")
                destination_id = read_int("Destination ID: ")
                destination = destinations[destination_id]
                trip_service.add_trip(
                    admin,
                    read_int("New trip ID: "),
                    input("Title: ").strip(),
                    date.fromisoformat(input("Start date YYYY-MM-DD: ").strip()),
                    date.fromisoformat(input("End date YYYY-MM-DD: ").strip()),
                    read_decimal("Price: "),
                    read_int("Available seats: "),
                    destination,
                )
                print("Trip added.")
            elif choice == 2:
                trip_id = read_int("Trip ID: ")
                print("Enter a new title, or leave blank to keep the current title.")
                title = input("Title: ").strip()
                changes = {"title": title} if title else {}
                price = input("New price (blank to keep current): ").strip()
                if price:
                    changes["price"] = Decimal(price)
                trip_service.update_trip(admin, trip_id, **changes)
                print("Trip updated.")
            elif choice == 3:
                trip_service.delete_trip(admin, read_int("Trip ID: "))
                print("Trip deleted.")
            elif choice == 4:
                display_trips(trip_service.list_all_trips())
            elif choice == 5:
                return
            else:
                print("Choose a number from 1 to 5.")
        except (
            ValueError,
            KeyError,
            PermissionError,
            InvalidOperation,
            SQLAlchemyError,
        ) as error:
            print(f"Could not complete that action: {error}")


def main() -> None:
    """Start the demonstration command-line application."""
    database = Database()
    try:
        upgrade_schema(database)
        (
            customer,
            admin,
            trip_service,
            reservation_service,
            payment_service,
            destination_repository,
        ) = build_application(database)
        while True:
            print("\nTrip Reservation System")
            print("1. Customer  2. Administrator  3. Exit")
            try:
                choice = read_int("Choose a role: ")
            except ValueError:
                print("Enter a number from 1 to 3.")
                continue
            if choice == 1:
                customer.login()
                customer_menu(
                    customer, trip_service, reservation_service, payment_service
                )
                customer.logout()
            elif choice == 2:
                admin.login()
                admin_menu(admin, trip_service, destination_repository)
                admin.logout()
            elif choice == 3:
                print("Goodbye.")
                return
            else:
                print("Choose a number from 1 to 3.")
    finally:
        database.dispose()


if __name__ == "__main__":
    main()