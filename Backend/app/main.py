import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as trades_router
from app.database import engine, Base
import app.models

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Get allowed origins from env or default to * for flexibility
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trades_router)