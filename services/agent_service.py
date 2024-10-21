import datetime
from typing import List, Optional

from data.agent import Agent
from data.release import Release




def release_count() -> int:
    return 2_234_847



def package_count() -> int:
    return 274_000


def agents() -> int:
    return 1


def users() -> int:
    return 1


def latest_agents(limit: int = 5) -> List:
    return [
        {'id': 'fastapi', 'summary': 'A great web framework'},
        {'id': 'uvicorn', 'summary': 'Your favorite ASGI server'},
        {'id': 'httpx', 'summary': 'Requests for an async world'},
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

