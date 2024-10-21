import fastapi
from fastapi_chameleon import template
from starlette.requests import Request

from viewmodels.agents.details_viewmodel import DetailsViewModel

router = fastapi.APIRouter()


@router.get('/agent/{agent_name}')
@template(template_file='agent/details.pt')
def details(agent_name: str, request: Request):
    vm = DetailsViewModel(agent_name, request)
    return vm.to_dict()
