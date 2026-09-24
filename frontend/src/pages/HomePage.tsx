import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; body: string }
  | { status: "error"; message: string };

export function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    apiClient
      .GET("/health")
      .then(({ data, response }) => {
        if (cancelled) return;
        if (!response.ok || data === undefined) {
          setHealth({ status: "error", message: "Failed to reach the API" });
          return;
        }
        setHealth({ status: "ok", body: JSON.stringify(data) });
      })
      .catch(() => {
        if (cancelled) return;
        setHealth({ status: "error", message: "Failed to reach the API" });
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
      <p>
        <Link to="/groups">Create a group</Link>
      </p>
    </main>
  );
}
