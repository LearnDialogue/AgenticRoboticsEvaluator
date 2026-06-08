"""Add CPS framework table

Revision ID: 004
Revises: 003
Create Date: 2026-06-03

Creates the cps_indicators table for storing the Collaborative Problem
Solving framework. Each row is a behavioral indicator that the agent
uses during live conversation and post-session evaluation.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cps_indicators',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('facet', sa.String(100), nullable=False, index=True),
        sa.Column('sub_facet', sa.String(150), nullable=False),
        sa.Column('indicator', sa.Text(), nullable=False),
        sa.Column('valence', sa.String(10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('example_prompt', sa.Text(), nullable=True),
        sa.Column('literature_ref', sa.Text(), nullable=True),
        sa.Column('literature_doi', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('cps_indicators')
