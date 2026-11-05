from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.agent_instance import agent
from src.api.middleware import add_process_time_header
from src.api.routes import cases, chat, health

app = FastAPI(
    title="Legal Agent Proto",
    description="A prototype for a legal agent.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.middleware("http")(add_process_time_header)



app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(cases.router, prefix="/cases", tags=["cases"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

from src.config.settings import Settings
settings = Settings()

@app.get("/")
async def root():
    return {"message": "Welcome to the Legal Agent Proto API"}