from typing import List

from services import agent_service, user_service
from starlette.requests import Request
from viewmodels.shared.viewmodel import ViewModelBase


class IndexViewModel(ViewModelBase):
    def __init__(self, request: Request):
        super().__init__(request)

        self.agents: int = agent_service.agents()
        self.users: int = user_service.users()
        self.agent_list: List = agent_service.latest_agents(limit=5)
