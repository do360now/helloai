import datetime
from typing import List, Optional

from data.package import Package
from data.release import Release


def agents() -> int:
    return 2


def users() -> int:
    return 1


def latest_agents(limit: int = 5) -> List:
    return [
        {'id': 'Agent_X', 'summary': 'Save time and increase engagement with personalized, AI-generated posts!'},
        {'id': 'ChaGPT_Agent_X', 'summary': 'Same as Agent_X but it uses ChatGPT for generating content and images!'},
     
    ][:limit]


def get_package_by_id(package_name: str) -> Optional[Package]:
    package = Package(
        package_name,
        'This is the summary',
        'Full details here!',
        'https://fastapi.tiangolo.com/',
        'MIT',
        'Sebastián Ramírez',
    )
    return package


def get_latest_release_for_package(package_name: str) -> Optional[Release]:
    return Release('1.2.0', datetime.datetime.now())
