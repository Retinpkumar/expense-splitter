/**
 * Every 4xx response is `{"detail": "<message>"}` per `_docs/DECISIONS.md`
 * #13 — a plain string. The array-shaped `detail` (pydantic's pre-#13
 * default validation-error shape) is handled too, defensively, in case a
 * future endpoint bypasses the backend's normalizing exception handler.
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
