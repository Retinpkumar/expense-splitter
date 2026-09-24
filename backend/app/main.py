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
    this app already uses (see `_docs/DECISIONS.md`).

    For a custom `@model_validator`/`@field_validator` failure, pydantic
    prefixes the message with its error type (e.g. "Value error, ..." for a
    raised `ValueError`, "Assertion failed, ..." for a failed `assert`).
    `ctx.error` holds the original exception before that prefixing, so read
    from there instead of trying to strip every prefix pydantic might use.
    """
    error = exc.errors()[0]
    original_error = error.get("ctx", {}).get("error")
    message = str(original_error) if original_error is not None else error["msg"]
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": message})


app.include_router(health.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(settlements.router)
