"""Payment domain model for simulated payments."""

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING

from domain.enums import PaymentMethod, PaymentStatus

if TYPE_CHECKING:
    from domain.reservation import Reservation


@dataclass
class Payment:
    """A simulated payment associated with exactly one reservation."""

    id: int
    reservation: "Reservation"
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING

    def __post_init__(self) -> None:
        """Normalize monetary values and reject invalid amounts."""
        self.amount = Decimal(str(self.amount))
        if self.amount < 0:
            raise ValueError("Payment amount cannot be negative.")

    def process_payment(self) -> None:
        """Mark this simulated payment as completed."""
        if self.status is not PaymentStatus.PENDING:
            raise ValueError("Only pending payments can be processed.")
        self.status = PaymentStatus.COMPLETED

    def fail(self) -> None:
        """Mark a pending simulated payment as failed."""
        if self.status is not PaymentStatus.PENDING:
            raise ValueError("Only pending payments can fail.")
        self.status = PaymentStatus.FAILED

    def refund(self) -> None:
        """Mark a completed payment as refunded."""
        if self.status is not PaymentStatus.COMPLETED:
            raise ValueError("Only completed payments can be refunded.")
        self.status = PaymentStatus.REFUNDED