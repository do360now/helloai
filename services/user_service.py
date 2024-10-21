from typing import List, Optional

from data.user import User


def user_count() -> int:
    return 1


def create_account(name: str, email: str, password: str) -> User:
    return User(name, email, 'abc')


def login_user(email: str, password: str) -> Optional[User]:
    if password == 'abc':
        return User('test user', email, 'abc')

    return None

def latest_user_comments(limit: int = 5) -> List:
    return [
        {'id': '@MachadoClement', 'summary': 'I love it! It saves me time and increases engagement with personalized, AI-generated posts!'},
            
    ][:limit]