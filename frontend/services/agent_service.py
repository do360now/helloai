from typing import List, Optional

import sqlalchemy.orm
from data.agent import Agent
from data.release import Release

from data import db_session


def release_count() -> int:
    session = db_session.create_session()

    try:
        return session.query(Release).count()
    finally:
        session.close()


def agent_count() -> int:
    session = db_session.create_session()

    try:
        return session.query(Agent).count()
    finally:
        session.close()


def latest_agents(limit: int = 5) -> List[Agent]:
    session = db_session.create_session()

    try:
        releases = (
            session.query(Release)
            .options(sqlalchemy.orm.joinedload(Release.agent))
            .order_by(Release.created_date.desc())
            .limit(limit)
            .all()
        )
    finally:
        session.close()

    return list({r.agent for r in releases})


def get_agent_by_id(agent_name: str) -> Optional[Agent]:
    session = db_session.create_session()

    try:
        agent = session.query(Agent).filter(Agent.id == agent).first()
        return agent
    finally:
        session.close()


def get_latest_release_for_agent(agent_name: str) -> Optional[Release]:
    session = db_session.create_session()

    try:
        release = (
            session.query(Release)
            .filter(Release.agent_id == agent_name)
            .order_by(Release.created_date.desc())
            .first()
        )

        return release
    finally:
        session.close()


