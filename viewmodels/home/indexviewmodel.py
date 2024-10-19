from typing import List

from services import package_service, user_service
from starlette.requests import Request
from viewmodels.shared.viewmodel import ViewModelBase


class IndexViewModel(ViewModelBase):
    def __init__(self, request: Request):
        super().__init__(request)

        self.agents: int = package_service.agents()
        self.users: int = user_service.users()
        self.agent_list: List = package_service.latest_agents(limit=5)
