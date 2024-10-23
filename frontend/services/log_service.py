from data import db_session
from data.user import Log  # Assuming the Log model exists

def save_logs(user_id, log_data):
    session = db_session.create_session()
    try:
        log_entry = Log(user_id=user_id, log_data=log_data)
        session.add(log_entry)
        session.commit()
    finally:
        session.close()

def get_logs_for_user(user_id):
    session = db_session.create_session()
    try:
        return session.query(Log).filter(Log.user_id == user_id).all()
    finally:
        session.close()
