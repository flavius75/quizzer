from sqlmodel import SQLModel, create_engine, Session
from fastapi import Depends
from dotenv import load_dotenv
import os

load_dotenv()


engine = create_engine(os.environ.get('DATABASE_URL'))

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

