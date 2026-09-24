from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.routers import balances, expenses, groups, health, settlements

app = FastAPI(title="Expense Splitter API")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Normalizes pydantic's default validation-error array into the same
    `{"detail": "<message>"}` shape every explicitly-raised HTTPException in
    this app already uses (see `_docs/DECISIONS.md`)."""
    message = exc.errors()[0]["msg"]
    message = message.removeprefix("Value error, ")
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": message})


app.include_router(health.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(settlements.router)
