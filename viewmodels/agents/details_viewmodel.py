from services import package_service
from starlette.requests import Request
from viewmodels.shared.viewmodel import ViewModelBase


class DetailsViewModel(ViewModelBase):
    def __init__(self, agent_name: str, request: Request):
        super().__init__(request)

        self.agent_name = agent_name
        self.agent = agent_service.get_agent_by_id(agent_name)
        self.latest_release = agent_service.get_latest_release_for_agent(agent_name)
        self.latest_version = '0.0.0'
        self.is_latest = True
        self.maintainers = []

        if not self.agent or not self.latest_release:
            return

        self.latest_version = self.latest_release.version
        self.maintainers = self.agent.maintainers
