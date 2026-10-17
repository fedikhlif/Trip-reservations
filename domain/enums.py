"""Enumerations used by the domain models."""

from enum import Enum, auto


class ReservationStatus(Enum):
    """Possible states for a reservation."""

    PENDING = auto()
    CONFIRMED = auto()
    CANCELLED = auto()


class PaymentStatus(Enum):
    """Possible states for a simulated payment."""

    PENDING = auto()
    COMPLETED = auto()
    FAILED = auto()
    REFUNDED = auto()


class PaymentMethod(Enum):
    """Payment methods accepted by the demonstration system."""

    CREDIT_CARD = auto()
    PAYPAL = auto()
    BANK_TRANSFER = auto()