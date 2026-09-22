from fastapi import FastAPI

from app.routers import health

app = FastAPI(title="Expense Splitter API")

app.include_router(health.router)
