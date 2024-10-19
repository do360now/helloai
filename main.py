import fastapi
import fastapi_chameleon
import uvicorn
from starlette.staticfiles import StaticFiles

from routers import account
from routers import home


app = fastapi.FastAPI()


def main():
    configure(dev_mode=True)
    uvicorn.run(app, host='127.0.0.1', port=8000)


def configure(dev_mode: bool):
    configure_templates(dev_mode)
    configure_routes()


def configure_templates(dev_mode: bool):
    fastapi_chameleon.global_init('templates', auto_reload=dev_mode)


def configure_routes():
    app.mount('/static', StaticFiles(directory='static'), name='static')
    app.include_router(home.router)
    app.include_router(account.router)


if __name__ == '__main__':
    main()
else:
    configure(dev_mode=False)
