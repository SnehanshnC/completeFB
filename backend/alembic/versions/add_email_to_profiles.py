"""add email column to profiles

Revision ID: a1b2c3d4e5f6
Revises: 0e85d19577f9
Create Date: 2026-02-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str]] = '0e85d19577f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add email column to profiles table."""
    # Add column as nullable first so existing rows don't break
    op.add_column('profiles', sa.Column('email', sa.String(length=255), nullable=True))
    # For any existing profiles, email can be back-filled manually or via a script.
    # Once back-filled, make it non-nullable:
    # op.alter_column('profiles', 'email', nullable=False)
    op.create_unique_constraint('uq_profiles_email', 'profiles', ['email'])


def downgrade() -> None:
    """Remove email column from profiles table."""
    op.drop_constraint('uq_profiles_email', 'profiles', type_='unique')
    op.drop_column('profiles', 'email')
