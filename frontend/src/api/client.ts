import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Defaults to the Vite dev-server proxy (see vite.config.ts), which forwards
// to the backend without requiring CORS middleware there. Override via
// VITE_API_BASE_URL for an absolute URL (e.g. a backend with CORS enabled).
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = createClient<paths>({ baseUrl });
