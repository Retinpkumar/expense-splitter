/**
 * FastAPI error bodies vary by source: a plain HTTPException has a string
 * `detail`, while a pydantic validation error has a `detail` array of
 * `{msg, ...}` objects. Handle both defensively without assuming a shape.
 */
export function extractErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("detail" in error)) {
    return null;
  }

  const detail = (error as { detail: unknown }).detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as { msg: unknown }).msg);
    }
  }

  return null;
}
