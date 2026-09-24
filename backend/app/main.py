from fastapi import FastAPI

from app.routers import balances, expenses, groups, health, settlements

app = FastAPI(title="Expense Splitter API")

app.include_router(health.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(settlements.router)
