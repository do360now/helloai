# Source: [74]
from celery import Celery
from services import user_service, log_service

app = Celery('agent', broker='redis://localhost:6379/0')

@app.task
def run_agent(user_id):
    # Fetch API keys from the database for the user
    user = user_service.get_user_by_id(user_id)
    
    # Run the agent using the user's API keys
    run_twitter_openai_agent(user.api_key, user.api_secret, user.access_token, user.access_secret, user.openai_api_key)

    # Log results and status
    log_service.save_logs(user_id, "Agent completed successfully")


def update_agent_status(user_id, status):
    session = db_session.create_session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        user.agent_status = status
        session.commit()
    finally:
        session.close()
