from fastapi import FastAPI

from app.routers import expenses, groups, health

app = FastAPI(title="Expense Splitter API")

app.include_router(health.router)
app.include_router(groups.router)
app.include_router(expenses.router)
