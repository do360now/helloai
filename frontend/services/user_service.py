from typing import List, Optional
from data.user import User
from passlib.handlers.sha2_crypt import sha512_crypt as crypto
from data import db_session


def user_count() -> int:
    session = db_session.create_session()

    try:
        return session.query(User).count()
    finally:
        session.close()


def create_account(name: str, email: str, password: str) -> User:
    session = db_session.create_session()

    try:
        user = User()
        user.email = email
        user.name = name
        user.hash_password = crypto.hash(password, rounds=172_434)

        session.add(user)
        session.commit()

        return user
    finally:
        session.close()


def login_user(email: str, password: str) -> Optional[User]:
    session = db_session.create_session()

    try:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            return user

        if not crypto.verify(password, user.hash_password):
            return None

        return user
    finally:
        session.close()


def get_user_by_id(user_id: int) -> Optional[User]:
    session = db_session.create_session()

    try:
        return session.query(User).filter(User.id == user_id).first()
    finally:
        session.close()


def get_user_by_email(email: str) -> Optional[User]:
    session = db_session.create_session()

    try:
        return session.query(User).filter(User.email == email).first()
    finally:
        session.close()


def latest_user_comments(limit: int = 5) -> List:
    return [
        {'id': '@MachadoClement', 'summary': 'I love it! It saves me time and increases engagement with personalized, AI-generated posts!'},
    ][:limit]


def update_api_keys(user_id: int, api_key: str, api_secret: str, access_token: str, access_secret: str) -> bool:
    session = db_session.create_session()

    try:
        # Find the user by ID
        user = session.query(User).filter(User.id == user_id).first()

        if not user:
            return False  # User not found
        
        # Log the keys for debugging (remove this in production)
        print(f"API Key: {api_key}, API Secret: {api_secret}, Access Token: {access_token}, Access Secret: {access_secret}")


        # Update the user's API keys
        user.api_key = api_key
        user.api_secret = api_secret
        user.access_token = access_token
        user.access_secret = access_secret

        # Commit the changes
        session.commit()
        return True

    except Exception as e:
        print(f"Error updating API keys: {e}")
        session.rollback()
        return False

    finally:
        session.close()
