import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { makeMemberLabel } from "../api/memberLabel";
import type { Balances, Expense, Member } from "../api/types";
import { ExpenseList } from "../components/ExpenseList";

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

type NavigationState = { name?: string; members?: Member[] };

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const navigationState = (location.state as NavigationState | null) ?? {};
  const parsedGroupId = Number(groupId);
  const groupId_ = Number.isInteger(parsedGroupId) ? parsedGroupId : null;

  const [expensesState, setExpensesState] = useState<LoadState<Expense[]>>({ status: "loading" });
  const [balancesState, setBalancesState] = useState<LoadState<Balances>>({ status: "loading" });

  useEffect(() => {
    if (groupId_ === null) return;

    let cancelled = false;
    setExpensesState({ status: "loading" });
    setBalancesState({ status: "loading" });

    apiClient
      .GET("/groups/{group_id}/expenses", { params: { path: { group_id: groupId_ } } })
      .then(({ data, response }) => {
        if (cancelled) return;
        if (!response.ok || data === undefined) {
          setExpensesState({ status: "error", message: "Failed to load expenses" });
          return;
        }
        setExpensesState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setExpensesState({ status: "error", message: "Failed to load expenses" });
      });

    apiClient
      .GET("/groups/{group_id}/balances", { params: { path: { group_id: groupId_ } } })
      .then(({ data, response }) => {
        if (cancelled) return;
        if (!response.ok || data === undefined) {
          setBalancesState({ status: "error", message: "Failed to load balances" });
          return;
        }
        setBalancesState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setBalancesState({ status: "error", message: "Failed to load balances" });
      });

    return () => {
      cancelled = true;
    };
  }, [groupId_]);

  const memberLabel = makeMemberLabel(navigationState.members ?? []);

  if (groupId_ === null) {
    return (
      <main>
        <h1>Invalid group</h1>
        <p role="alert">The group id in the URL is not valid.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{navigationState.name ?? `Group #${groupId_}`}</h1>

      <section>
        <h2>Expenses</h2>
        {expensesState.status === "loading" && <p>Loading...</p>}
        {expensesState.status === "error" && <p role="alert">{expensesState.message}</p>}
        {expensesState.status === "ready" && expensesState.data.length === 0 && <p>No expenses yet.</p>}
        {expensesState.status === "ready" && expensesState.data.length > 0 && (
          <ExpenseList expenses={expensesState.data} memberLabel={memberLabel} />
        )}
      </section>

      <section>
        <h2>Balances</h2>
        {balancesState.status === "loading" && <p>Loading...</p>}
        {balancesState.status === "error" && <p role="alert">{balancesState.message}</p>}
        {balancesState.status === "ready" && Object.keys(balancesState.data).length === 0 && (
          <p>All settled up.</p>
        )}
        {balancesState.status === "ready" &&
          Object.entries(balancesState.data).map(([currency, entries]) => (
            <div key={currency}>
              <h3>{currency}</h3>
              {entries.length === 0 ? (
                <p>All settled up in {currency}.</p>
              ) : (
                <ul>
                  {entries.map((entry) => (
                    <li key={`${entry.from_member_id}-${entry.to_member_id}`}>
                      {memberLabel(entry.from_member_id)} owes {memberLabel(entry.to_member_id)}{" "}
                      {entry.amount}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </section>
    </main>
  );
}
