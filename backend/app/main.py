from fastapi import FastAPI

from app.routers import groups, health

app = FastAPI(title="Expense Splitter API")

app.include_router(health.router)
app.include_router(groups.router)
