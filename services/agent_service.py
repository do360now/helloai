import datetime
from typing import List, Optional

from data.agent import Agent
from data.release import Release


def agents() -> int:
    return 1


def users() -> int:
    return 1


def latest_agents(limit: int = 5) -> List:
    return [
        {'id': '@MachadoClement', 'summary': 'I love it! It saves me time and increases engagement with personalized, AI-generated posts!'},
            
    ][:limit]


def get_agent_by_id(agent_name: str) -> Optional[Agent]:
    agent = Agent(
        agent_name,
        'This is the summary',
        'Full details here!',
        'https://fastapi.tiangolo.com/',
        'MIT',
        'Sebastián Ramírez',
    )
    return agent


def get_latest_release_for_agent(agent_name: str) -> Optional[Release]:
    return Release('1.2.0', datetime.datetime.now())
