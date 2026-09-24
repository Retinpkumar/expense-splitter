import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; body: string }
  | { status: "error"; message: string };

export function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    apiClient.GET("/health").then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setHealth({ status: "error", message: "Failed to reach the API" });
        return;
      }
      setHealth({ status: "ok", body: JSON.stringify(data) });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Expense Splitter</h1>
      <p>Backend health check:</p>
      {health.status === "loading" && <p>Checking...</p>}
      {health.status === "ok" && <p data-testid="health-result">{health.body}</p>}
      {health.status === "error" && <p role="alert">{health.message}</p>}
    </main>
  );
}
