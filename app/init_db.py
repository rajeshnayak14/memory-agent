from app.database import Base, engine
from app.model import User

Base.metadata.create_all(bind=engine)

print("Database tables created.")