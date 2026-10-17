"""Convert SQLAlchemy rows into the existing domain dataclasses."""

from decimal import Decimal

from domain.admin import Admin
from domain.customer import Customer
from domain.destination import Destination
from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus
from domain.payment import Payment
from domain.reservation import Reservation
from domain.trip import Trip
from models import (
    DestinationModel,
    PaymentModel,
    ReservationModel,
    TripModel,
    UserModel,
    UserRole,
)


def user_to_domain(model: UserModel) -> Customer | Admin:
    """Map the shared users table row to its Customer or Admin dataclass."""
    user_type = Customer if model.role is UserRole.CUSTOMER else Admin
    return user_type(model.id, model.name, model.email, model.password_hash)


def destination_to_domain(model: DestinationModel) -> Destination:
    """Map a destination ORM row to its domain value object."""
    return Destination(model.id, model.name, model.country, model.description or "")


def trip_to_domain(model: TripModel) -> Trip:
    """Map a trip and its destination relationship to domain objects."""
    return Trip(
        model.id,
        model.title,
        model.start_date,
        model.end_date,
        Decimal(model.price),
        model.available_seats,
        destination_to_domain(model.destination),
    )


def reservation_to_domain(
    model: ReservationModel, include_payment: bool = True
) -> Reservation:
    """Map a reservation and its customer/trip/optional payment relationships."""
    customer = user_to_domain(model.customer)
    if not isinstance(customer, Customer):
        raise ValueError("Reservation customer row does not have customer role.")
    trip = trip_to_domain(model.trip)
    reservation = Reservation(
        model.id,
        customer,
        trip,
        model.booking_date,
        model.status,
        Decimal(model.total_price),
        traveler_count=model.traveler_count,
    )
    customer.reservations.append(reservation)
    trip.reservations.append(reservation)
    if include_payment and model.payment is not None:
        reservation.payment = payment_to_domain(model.payment, reservation)
    return reservation


def payment_to_domain(
    model: PaymentModel, reservation: Reservation | None = None
) -> Payment:
    """Map a payment and its parent reservation without recursive conversion."""
    reservation = reservation or reservation_to_domain(
        model.reservation, include_payment=False
    )
    payment = Payment(
        model.id,
        reservation,
        Decimal(model.amount),
        PaymentMethod[model.method.name],
        PaymentStatus[model.status.name],
    )
    reservation.payment = payment
    return payment