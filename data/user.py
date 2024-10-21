import datetime

import sqlalchemy as sa
from data.modelbase import SqlAlchemyBase


# With DB
class User(SqlAlchemyBase):
    __tablename__ = 'users'

    id: int = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    name: str = sa.Column(sa.String)
    email: str = sa.Column(sa.String, index=True, unique=True)
    hash_password: str = sa.Column(sa.String)
    created_date: datetime.datetime = sa.Column(sa.DateTime, default=datetime.datetime.now, index=True)
    last_login: datetime.datetime = sa.Column(sa.DateTime, default=datetime.datetime.now, index=True)
    profile_image_url: str = sa.Column(sa.String)

# Without DB
# class User:
#     def __init__(self, name, email, hashed_password):
#         self.id = 1
#         self.name = name
#         self.email = email
#         self.hash_password = hashed_password
#         self.created_date = None
#         self.profile_image_url = ''
#         self.last_login: datetime.datetime = None
