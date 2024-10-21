from typing import List

from services import agent_service, user_service
from starlette.requests import Request
from viewmodels.shared.viewmodel import ViewModelBase


class IndexViewModel(ViewModelBase):
    def __init__(self, request: Request):
        super().__init__(request)

        self.release_count: int = agent_service.release_count()
        self.user_count: int = user_service.user_count()
        self.agent_count: int = agent_service.agent_count()
        self.agents: List = agent_service.latest_agents(limit=5)
        self.user_comments: List = user_service.latest_user_comments(limit=5)
