from typing import Callable, Optional

import sqlalchemy as sa
import sqlalchemy.orm as orm
from data.modelbase import SqlAlchemyBase
from sqlalchemy.orm import Session

__factory: Optional[Callable[[], Session]] = None

def global_init(connection_str: str):
    """Initialize the database connection using a connection string."""
    global __factory

    if __factory:
        return

    if not connection_str or not connection_str.strip():
        raise Exception('You must specify a valid database connection string.')

    print('Connecting to DB with {}'.format(connection_str))

    # Create the SQLAlchemy engine
    engine = sa.create_engine(connection_str, echo=False)
    __factory = orm.sessionmaker(bind=engine)

    # Import all models and create tables
    import data.__all_models  # Ensure all models are imported
    SqlAlchemyBase.metadata.create_all(engine)

def create_session() -> Session:
    """Create and return a new session."""
    global __factory

    if not __factory:
        raise Exception('You must call global_init() before using this method.')

    session: Session = __factory()
    session.expire_on_commit = False

    return session
