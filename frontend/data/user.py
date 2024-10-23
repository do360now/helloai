import datetime
import sqlalchemy as sa
from data.modelbase import SqlAlchemyBase


class User(SqlAlchemyBase):
    __tablename__ = 'users'

    id: int = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    name: str = sa.Column(sa.String)
    email: str = sa.Column(sa.String, index=True, unique=True)
    hash_password: str = sa.Column(sa.String)
    created_date: datetime.datetime = sa.Column(sa.DateTime, default=datetime.datetime.now, index=True)
    last_login: datetime.datetime = sa.Column(sa.DateTime, default=datetime.datetime.now, index=True)
    profile_image_url: str = sa.Column(sa.String)

    # API keys for Twitter and OpenAI (optional initially)
    api_key: str = sa.Column(sa.String, nullable=True)
    api_secret: str = sa.Column(sa.String, nullable=True)
    access_token: str = sa.Column(sa.String, nullable=True)
    access_secret: str = sa.Column(sa.String, nullable=True)
    # openai_api_key: str = sa.Column(sa.String, nullable=True)

    # Agent status tracking
    agent_status: str = sa.Column(sa.String, nullable=True)  # "Running", "Stopped", "Error", etc.
    agent_last_run: datetime.datetime = sa.Column(sa.DateTime, nullable=True)  # Last time agent ran

class Log(SqlAlchemyBase):
    __tablename__ = 'logs'

    id: int = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    user_id: int = sa.Column(sa.Integer, sa.ForeignKey('users.id'), nullable=False)
    timestamp: datetime.datetime = sa.Column(sa.DateTime, default=datetime.datetime.now, index=True)
    log_data: str = sa.Column(sa.Text, nullable=False)
    
    # Optionally, you can define a relationship back to the User model
    user = sa.orm.relationship('User', backref='logs')
