"""Add image_url to destinations.

Revision ID: a1b2c3d4e5f6
Revises: 47b063a5429c
Create Date: 2026-11-03 09:22:00

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '47b063a5429c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('destinations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('destinations', schema=None) as batch_op:
        batch_op.drop_column('image_url')

