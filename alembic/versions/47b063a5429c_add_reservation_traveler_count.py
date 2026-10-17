"""Add traveler counts to reservations.

Revision ID: 47b063a5429c
Revises: 1d1eef57ca4d
Create Date: 2026-10-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "47b063a5429c"
down_revision: Union[str, Sequence[str], None] = "1d1eef57ca4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Preserve existing reservations as one traveler each."""
    op.add_column(
        "reservations",
        sa.Column(
            "traveler_count",
            sa.Integer(),
            nullable=False,
            server_default="1",
            comment="Number of seats reserved by this booking",
        ),
    )
    with op.batch_alter_table("reservations") as batch_op:
        batch_op.create_check_constraint(
            "travelers_positive", "traveler_count >= 1"
        )


def downgrade() -> None:
    """Remove traveler counts without changing reservation rows."""
    with op.batch_alter_table("reservations") as batch_op:
        batch_op.drop_constraint("travelers_positive", type_="check")
        batch_op.drop_column("traveler_count")
