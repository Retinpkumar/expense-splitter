import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { makeMemberLabel } from "../api/memberLabel";
import { parseAmount } from "../api/money";
import type { Balances, Expense, Member } from "../api/types";
import { ExpenseList } from "../components/ExpenseList";

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

type NavigationState = { name?: string; members?: Member[] };

async function loadExpenses(groupId: number): Promise<LoadState<Expense[]>> {
  try {
    const { data, response } = await apiClient.GET("/groups/{group_id}/expenses", {
      params: { path: { group_id: groupId } },
    });
    if (!response.ok || data === undefined) {
      return { status: "error", message: "Failed to load expenses" };
    }
    return { status: "ready", data };
  } catch {
    return { status: "error", message: "Failed to load expenses" };
  }
}

async function loadBalances(groupId: number): Promise<LoadState<Balances>> {
  try {
    const { data, response } = await apiClient.GET("/groups/{group_id}/balances", {
      params: { path: { group_id: groupId } },
    });
    if (!response.ok || data === undefined) {
      return { status: "error", message: "Failed to load balances" };
    }
    return { status: "ready", data };
  } catch {
    return { status: "error", message: "Failed to load balances" };
  }
}

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const navigationState = (location.state as NavigationState | null) ?? {};
  const parsedGroupId = Number(groupId);
  const groupId_ = Number.isInteger(parsedGroupId) ? parsedGroupId : null;

  const [expensesState, setExpensesState] = useState<LoadState<Expense[]>>({ status: "loading" });
  const [balancesState, setBalancesState] = useState<LoadState<Balances>>({ status: "loading" });

  const [fromMemberId, setFromMemberId] = useState<number | "">("");
  const [toMemberId, setToMemberId] = useState<number | "">("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleCurrency, setSettleCurrency] = useState("INR");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  // Monotonic counter identifying the latest load attempt (including the
  // post-settlement balance refresh, which runs outside this effect).
  // Comparing a request's own id against the current counter — rather than
  // against the groupId it was for — correctly discards a stale response
  // even when it's for the *same* group as the latest request: a fetch
  // isn't just stale when the group changes, it's stale whenever a newer
  // fetch has since been issued for any reason (revisiting the same group
  // before the first request resolved, unmounting, or a settle-triggered
  // refresh in flight at the same time as the initial load).
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (groupId_ === null) return;

    const requestId = ++latestRequestIdRef.current;
    setExpensesState({ status: "loading" });
    setBalancesState({ status: "loading" });

    loadExpenses(groupId_).then((result) => {
      if (latestRequestIdRef.current === requestId) setExpensesState(result);
    });
    loadBalances(groupId_).then((result) => {
      if (latestRequestIdRef.current === requestId) setBalancesState(result);
    });
  }, [groupId_]);

  const memberLabel = makeMemberLabel(navigationState.members ?? []);

  // No member-listing endpoint exists yet, so the settle-up form can only
  // offer members it has actually seen — from nav state, expenses, or
  // existing balances — not the group's full roster.
  const knownMemberIds = useMemo(() => {
    const ids = new Set<number>();
    for (const member of navigationState.members ?? []) ids.add(member.id);
    if (expensesState.status === "ready") {
      for (const expense of expensesState.data) {
        ids.add(expense.payer_id);
        for (const split of expense.splits) ids.add(split.member_id);
      }
    }
    if (balancesState.status === "ready") {
      for (const entries of Object.values(balancesState.data)) {
        for (const entry of entries) {
          ids.add(entry.from_member_id);
          ids.add(entry.to_member_id);
        }
      }
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [navigationState.members, expensesState, balancesState]);

  async function handleSettle(event: FormEvent) {
    event.preventDefault();
    setSettleError(null);

    if (groupId_ === null) return;
    if (fromMemberId === "" || toMemberId === "") {
      setSettleError("Select both members");
      return;
    }
    if (fromMemberId === toMemberId) {
      setSettleError("Select two different members");
      return;
    }
    const amountValue = parseAmount(settleAmount);
    if (amountValue === null || amountValue <= 0) {
      setSettleError("Enter a valid amount greater than zero");
      return;
    }

    setSettling(true);
    try {
      const { data, error, response } = await apiClient.POST("/groups/{group_id}/settlements", {
        params: { path: { group_id: groupId_ } },
        body: {
          from_member_id: fromMemberId,
          to_member_id: toMemberId,
          amount: settleAmount,
          currency: settleCurrency,
        },
      });

      if (!response.ok || !data) {
        setSettleError(extractErrorMessage(error) ?? "Failed to record settlement");
        return;
      }

      setSettleAmount("");
      const requestId = ++latestRequestIdRef.current;
      const result = await loadBalances(groupId_);
      if (latestRequestIdRef.current === requestId) setBalancesState(result);
    } catch {
      setSettleError("Failed to record settlement");
    } finally {
      setSettling(false);
    }
  }

  if (groupId_ === null) {
    return (
      <main>
        <h1>Invalid group</h1>
        <p role="alert">The group id in the URL is not valid.</p>
      </main>
    );
  }

  const memberOptions = knownMemberIds.map((id) => (
    <option key={id} value={id}>
      {memberLabel(id)}
    </option>
  ));

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

      {knownMemberIds.length >= 2 && (
        <section>
          <h2>Settle up</h2>
          <form onSubmit={handleSettle}>
            <label>
              From
              <select
                value={fromMemberId}
                onChange={(event) =>
                  setFromMemberId(event.target.value === "" ? "" : Number(event.target.value))
                }
                required
              >
                <option value="">Select member</option>
                {memberOptions}
              </select>
            </label>

            <label>
              To
              <select
                value={toMemberId}
                onChange={(event) =>
                  setToMemberId(event.target.value === "" ? "" : Number(event.target.value))
                }
                required
              >
                <option value="">Select member</option>
                {memberOptions}
              </select>
            </label>

            <label>
              Amount
              <input
                value={settleAmount}
                onChange={(event) => setSettleAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </label>

            <label>
              Currency
              <input
                value={settleCurrency}
                onChange={(event) => setSettleCurrency(event.target.value)}
                required
              />
            </label>

            {settleError && <p role="alert">{settleError}</p>}

            <button type="submit" disabled={settling}>
              Record settlement
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
