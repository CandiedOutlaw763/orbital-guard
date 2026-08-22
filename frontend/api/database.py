import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

postgres_url = os.getenv("POSTGRES_URL")

if postgres_url:
    # SQLAlchemy requires postgresql:// instead of postgres://
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql+pg8000://", 1)
    elif postgres_url.startswith("postgresql://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+pg8000://", 1)
    SQLALCHEMY_DATABASE_URL = postgres_url
    # For Postgres, we don't need check_same_thread
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    db_path = os.path.join(os.path.dirname(__file__), "space_dashboard.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class TrackedObject(Base):
    __tablename__ = "tracked_objects"
    
    norad_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    rcs_size = Column(String, nullable=True) # SMALL, MEDIUM, LARGE
    tle_line1 = Column(String)
    tle_line2 = Column(String)
    epoch = Column(DateTime)
    object_type = Column(String)

class Conjunction(Base):
    __tablename__ = "conjunctions"
    
    id = Column(Integer, primary_key=True, index=True)
    object1_id = Column(Integer, index=True)
    object2_id = Column(Integer, index=True)
    tca_time = Column(DateTime, index=True)
    miss_distance_km = Column(Float)
    relative_velocity_km_s = Column(Float)
    risk_score = Column(Float)

class MasterCatalog(Base):
    __tablename__ = "master_catalog"
    
    norad_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    tle_line1 = Column(String)
    tle_line2 = Column(String)

Base.metadata.create_all(bind=engine)
