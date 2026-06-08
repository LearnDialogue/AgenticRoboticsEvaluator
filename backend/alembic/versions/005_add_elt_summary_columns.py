"""Add ELT-aligned columns to session_summaries

Revision ID: 005
Revises: 004
Create Date: 2026-06-03

Adds four columns to session_summaries that map to Kolb's Experiential
Learning Theory phases. Existing columns are preserved — both sets coexist.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('session_summaries',
                  sa.Column('concrete_experience', sa.Text(), nullable=True))
    op.add_column('session_summaries',
                  sa.Column('reflective_observation', sa.Text(), nullable=True))
    op.add_column('session_summaries',
                  sa.Column('abstract_conceptualization', sa.Text(), nullable=True))
    op.add_column('session_summaries',
                  sa.Column('active_experimentation', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('session_summaries', 'active_experimentation')
    op.drop_column('session_summaries', 'abstract_conceptualization')
    op.drop_column('session_summaries', 'reflective_observation')
    op.drop_column('session_summaries', 'concrete_experience')
