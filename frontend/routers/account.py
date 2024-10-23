import fastapi
from celery import Celery
from fastapi_chameleon import template
from infrastructure import cookie_auth
from services import user_service, log_service
from starlette import status
from starlette.requests import Request
from viewmodels.account.account_viewmodel import AccountViewModel
from viewmodels.account.login_viewmodel import LoginViewModel
from viewmodels.account.register_viewmodel import RegisterViewModel
from X.tasks import run_agent  # Import your Celery task

router = fastapi.APIRouter()


# ################### ACCOUNT ###############################
@router.get('/account')
@template()
def index(request: Request):
    # Check if the user is logged in
    user = cookie_auth.get_current_user(request)
    is_logged_in = user is not None

    # Fetch logs for the user if logged in
    logs = log_service.get_logs_for_user(user.id) if is_logged_in else []

    # Pass the user, logs, and is_logged_in status to the template
    return {
        'user': user,
        'logs': logs,
        'is_logged_in': is_logged_in
    }



@router.get('/account/register')
@template()
def register(request: Request):
    vm = RegisterViewModel(request)
    return vm.to_dict()


@router.post('/account/register')
@template()
async def register(request: Request):
    vm = RegisterViewModel(request)
    await vm.load()

    if vm.error:
        return vm.to_dict()

    # Create the account
    account = user_service.create_account(vm.name, vm.email, vm.password)

    # Login user
    response = fastapi.responses.RedirectResponse(url='/account', status_code=status.HTTP_302_FOUND)
    cookie_auth.set_auth(response, account.id)

    return response


# ################### LOGIN #################################
@router.get('/account/login')
@template(template_file='account/login.pt')
def login_get(request: Request):
    vm = LoginViewModel(request)
    return vm.to_dict()


@router.post('/account/login')
@template(template_file='account/login.pt')
async def login_post(request: Request):
    vm = LoginViewModel(request)
    await vm.load()

    if vm.error:
        return vm.to_dict()

    user = user_service.login_user(vm.email, vm.password)
    if not user:
        vm.error = 'The account does not exist or the password is wrong.'
        return vm.to_dict()

    resp = fastapi.responses.RedirectResponse('/account', status_code=status.HTTP_302_FOUND)
    cookie_auth.set_auth(resp, user.id)

    return resp


@router.get('/account/logout')
def logout():
    response = fastapi.responses.RedirectResponse(url='/', status_code=status.HTTP_302_FOUND)
    cookie_auth.logout(response)
    return response


# ################### API KEYS ###############################
@router.post('/account/api-keys')
async def update_api_keys(request: Request):
    form_data = await request.form()

    api_key = form_data.get('api_key')
    api_secret = form_data.get('api_secret')
    access_token = form_data.get('access_token')
    access_secret = form_data.get('access_secret')

    # Fetch the current user from the cookie
    user = cookie_auth.get_current_user(request)

    # Save or update the keys in the database, associated with the user
    user_service.update_api_keys(user.id, api_key, api_secret, access_token, access_secret)

    return fastapi.responses.RedirectResponse(url='/account', status_code=status.HTTP_302_FOUND)


# ################### AGENT #################################
@router.post('/account/agent/start')
async def start_agent(request: Request):
    user = cookie_auth.get_current_user(request)

    # Trigger the background task
    run_agent.delay(user.id)  # `delay` runs the task asynchronously in the background

    # Redirect back to the account page to display the logs
    return fastapi.responses.RedirectResponse(url='/account', status_code=status.HTTP_302_FOUND)


# ################### LOGS ##################################
@router.get('/account/agent/logs')
@template()
async def view_logs(request: Request):
    user = cookie_auth.get_current_user(request)
    logs = log_service.get_logs_for_user(user.id)
    return {'user': user, 'logs': logs}
