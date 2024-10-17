import fastapi
import fastapi_chameleon
import uvicorn

from routers import home, account

app = fastapi.FastAPI()

fastapi_chameleon.global_init("templates")

app.include_router(home.router)
app.include_router(account.router)

if __name__ == "__main__":
    uvicorn.run(app)
