from pathlib import Path
import fastapi
import fastapi_chameleon
import uvicorn
import os
import logging
from data import db_session
from sqlalchemy import create_engine
from starlette.staticfiles import StaticFiles
from routers import account, home, agent
from dotenv import load_dotenv

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = fastapi.FastAPI()

# Load environment variables from the .env file
logger.info("Loading environment variables from .env file...")
load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_SERVER = os.getenv("DB_SERVER")
DB_DRIVER = os.getenv("DB_DRIVER")

logger.info(f"Loaded DB_NAME:{DB_NAME}, DB_USER:{DB_USER}, DB_PASSWORD:{DB_PASSWORD}, DB_SERVER:{DB_SERVER}, and DB_DRIVER:{DB_DRIVER} environment variables from .env file...")

def main():
    configure(dev_mode=True)
    uvicorn.run(app, host='0.0.0.0', port=8000)

def configure(dev_mode: bool):
    configure_templates(dev_mode)
    configure_routes()
    configure_db(dev_mode)

def configure_db(dev_mode: bool):
    if dev_mode:
        # Use SQL Server container for development
        connection_string = f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:1433/{DB_NAME}?driver={DB_DRIVER}"
        db_session.global_init(connection_string)
    else:
        # Azure SQL Database setup for production
        connection_string = f"mssql+pyodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:1433/{DB_NAME}?driver={DB_DRIVER}"
        db_session.global_init(connection_string)

def configure_templates(dev_mode: bool):
    fastapi_chameleon.global_init('templates', auto_reload=dev_mode)

def configure_routes():
    app.mount('/static', StaticFiles(directory='static'), name='static')
    app.include_router(home.router)
    app.include_router(account.router)
    app.include_router(agent.router)

if __name__ == '__main__':
    main()
else:
    configure(dev_mode=False)
