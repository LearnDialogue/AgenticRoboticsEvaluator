"""
Seed script for the CPS (Collaborative Problem Solving) framework.

Populates the cps_indicators table with the structural data from the
OECD PISA 2015 CPS framework. Only facet, sub_facet, indicator, and
valence are seeded — the researcher fills in example_prompt and
literature_ref via the admin API.

Usage:
    docker compose exec backend python seed_cps.py

Idempotent: skips indicators that already exist (matched by indicator text).
"""

import sys
import os

# Add the backend app to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.cps_indicator import CPSIndicator


# Structural data: (facet, sub_facet, indicator, valence, sort_order)
CPS_SEED_DATA = [
    # --- Facet 1: Constructing shared knowledge ---
    (
        "Constructing shared knowledge",
        "Shares understanding of problems and solutions",
        "Talks about ideas or topics related to solving the problem",
        "positive",
        1,
    ),
    (
        "Constructing shared knowledge",
        "Shares understanding of problems and solutions",
        "Proposes a solution",
        "positive",
        2,
    ),
    (
        "Constructing shared knowledge",
        "Shares understanding of problems and solutions",
        "Talks about constraints of the task",
        "positive",
        3,
    ),
    (
        "Constructing shared knowledge",
        "Shares understanding of problems and solutions",
        "Builds on the ideas of another team member",
        "positive",
        4,
    ),
    (
        "Constructing shared knowledge",
        "Establishes common ground",
        "Confirms understanding by asking questions or paraphrasing",
        "positive",
        5,
    ),
    (
        "Constructing shared knowledge",
        "Establishes common ground",
        "Repairs misunderstandings",
        "positive",
        6,
    ),
    (
        "Constructing shared knowledge",
        "Establishes common ground",
        "Interrupts or talks over others",
        "negative",
        7,
    ),

    # --- Facet 2: Negotiation/Coordination ---
    (
        "Negotiation/Coordination",
        "Responds to others' questions/ideas",
        "Does not respond when spoken to by others",
        "negative",
        8,
    ),
    (
        "Negotiation/Coordination",
        "Responds to others' questions/ideas",
        "Makes rude or critical comments to others",
        "negative",
        9,
    ),
    (
        "Negotiation/Coordination",
        "Responds to others' questions/ideas",
        "Provides reasons to support or refute a potential solution",
        "positive",
        10,
    ),
    (
        "Negotiation/Coordination",
        "Monitors execution",
        "Makes an attempt to solve the problem after discussion",
        "positive",
        11,
    ),
    (
        "Negotiation/Coordination",
        "Monitors execution",
        "Talks about the results of an attempted solution",
        "positive",
        12,
    ),
    (
        "Negotiation/Coordination",
        "Monitors execution",
        "Brings up giving up on solving the problem",
        "negative",
        13,
    ),

    # --- Facet 3: Maintaining team function ---
    (
        "Maintaining team function",
        "Fulfills individual roles on the team",
        "Is not focused on solving the task",
        "negative",
        14,
    ),
    (
        "Maintaining team function",
        "Fulfills individual roles on the team",
        "Initiates or joins off-topic conversation",
        "negative",
        15,
    ),
    (
        "Maintaining team function",
        "Takes initiatives to advance collaboration",
        "Asks if others have suggestions",
        "positive",
        16,
    ),
    (
        "Maintaining team function",
        "Takes initiatives to advance collaboration",
        "Offers help or takes initiative",
        "positive",
        17,
    ),
    (
        "Maintaining team function",
        "Takes initiatives to advance collaboration",
        "Compliments or encourages others",
        "positive",
        18,
    ),
]


def seed_cps():
    """Insert CPS indicators if they don't already exist."""
    db = SessionLocal()
    try:
        created = 0
        skipped = 0

        for facet, sub_facet, indicator, valence, sort_order in CPS_SEED_DATA:
            # Check if this indicator already exists
            existing = (
                db.query(CPSIndicator)
                .filter(CPSIndicator.indicator == indicator)
                .first()
            )
            if existing:
                skipped += 1
                continue

            cps = CPSIndicator(
                facet=facet,
                sub_facet=sub_facet,
                indicator=indicator,
                valence=valence,
                sort_order=sort_order,
                # example_prompt and literature_ref left empty
                # for the researcher to fill in via admin API
            )
            db.add(cps)
            created += 1

        db.commit()
        print(f"CPS seed complete: {created} created, {skipped} skipped (already exist)")
        print(f"Total indicators in database: {db.query(CPSIndicator).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding CPS data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_cps()
