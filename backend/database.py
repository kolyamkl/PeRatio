from sqlmodel import Session, SQLModel, create_engine

from config import get_settings


settings = get_settings()
engine = create_engine(settings.database_url)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()
