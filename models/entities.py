"""Code-first SQLAlchemy models, independent from domain dataclasses."""

from enum import Enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from domain.enums import PaymentMethod, PaymentStatus, ReservationStatus


class UserRole(str, Enum):
    """Persistent roles stored for the shared User table."""

    CUSTOMER = "customer"
    ADMIN = "admin"


class Base(DeclarativeBase):
    """Declarative base with stable names for Alembic constraints."""

    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class UserModel(Base):
    """Customer and administrator row; role maps to the domain subtype."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('customer', 'admin')", name="role_values"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(
            UserRole,
            native_enum=False,
            length=16,
            values_callable=lambda enum_type: [member.value for member in enum_type],
            create_constraint=False,
        ),
        nullable=False,
    )
    reservations: Mapped[list["ReservationModel"]] = relationship(
        back_populates="customer"
    )


class DestinationModel(Base):
    """Persisted destination for trips."""

    __tablename__ = "destinations"
    __table_args__ = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    country: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    trips: Mapped[list["TripModel"]] = relationship(back_populates="destination")


class TripModel(Base):
    """Persisted bookable trip."""

    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("price >= 0", name="price_nonnegative"),
        CheckConstraint("available_seats >= 0", name="seats_nonnegative"),
        CheckConstraint("end_date >= start_date", name="date_order"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="RESTRICT"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2, asdecimal=True), nullable=False
    )
    available_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    destination: Mapped[DestinationModel] = relationship(back_populates="trips")
    reservations: Mapped[list["ReservationModel"]] = relationship(
        back_populates="trip"
    )


class ReservationModel(Base):
    """Persisted reservation linking one customer and one trip."""

    __tablename__ = "reservations"
    __table_args__ = (
        CheckConstraint("total_price >= 0", name="total_nonnegative"),
        CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'CANCELLED')",
            name="status_values",
        ),
        CheckConstraint("traveler_count >= 1", name="travelers_positive"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="RESTRICT"), nullable=False
    )
    booking_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        SqlEnum(
            ReservationStatus,
            native_enum=False,
            length=16,
            create_constraint=False,
        ),
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2, asdecimal=True), nullable=False
    )
    traveler_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    customer: Mapped[UserModel] = relationship(back_populates="reservations")
    trip: Mapped[TripModel] = relationship(back_populates="reservations")
    payment: Mapped["PaymentModel | None"] = relationship(
        back_populates="reservation", uselist=False
    )


class PaymentModel(Base):
    """Persisted simulated payment; unique reservation_id enforces one-to-one."""

    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("reservation_id", name="uq_payments_reservation"),
        CheckConstraint("amount >= 0", name="amount_nonnegative"),
        CheckConstraint(
            "method IN ('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER')",
            name="method_values",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')",
            name="status_values",
        ),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("reservations.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2, asdecimal=True), nullable=False
    )
    method: Mapped[PaymentMethod] = mapped_column(
        SqlEnum(
            PaymentMethod,
            native_enum=False,
            length=24,
            create_constraint=False,
        ),
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SqlEnum(
            PaymentStatus,
            native_enum=False,
            length=16,
            create_constraint=False,
        ),
    )
    reservation: Mapped[ReservationModel] = relationship(back_populates="payment")
