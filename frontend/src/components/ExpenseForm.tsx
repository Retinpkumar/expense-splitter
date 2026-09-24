import { useState, type FormEvent } from "react";
import { apiClient } from "../api/client";
import { extractErrorMessage } from "../api/errors";

type Member = { id: number; name: string };

type ExpenseSplit = { member_id: number; amount: string };
type Expense = {
  id: number;
  amount: string;
  currency: string;
  payer_id: number;
  splits: ExpenseSplit[];
};

type Props = {
  groupId: number;
  members: Member[];
  onCreated: (expense: Expense) => void;
};

/** Converts a decimal-string amount to integer cents, or null if invalid. */
function toCents(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function ExpenseForm({ groupId, members, onCreated }: Props) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [payerId, setPayerId] = useState<number | "">("");
  const [splitInputs, setSplitInputs] = useState<Record<number, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateSplit(memberId: number, value: string) {
    setSplitInputs((previous) => ({ ...previous, [memberId]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    const amountCents = toCents(amount);
    if (amountCents === null || amountCents <= 0) {
      setValidationError("Enter a valid amount greater than zero");
      return;
    }
    if (payerId === "") {
      setValidationError("Select a payer");
      return;
    }

    const splitEntries = members
      .map((member) => ({ member_id: member.id, raw: splitInputs[member.id] ?? "" }))
      .filter((entry) => entry.raw.trim() !== "");

    if (splitEntries.length === 0) {
      setValidationError("Enter at least one split amount");
      return;
    }

    let splitCentsTotal = 0;
    for (const entry of splitEntries) {
      const cents = toCents(entry.raw);
      if (cents === null) {
        setValidationError("Split amounts must be numbers");
        return;
      }
      splitCentsTotal += cents;
    }

    if (splitCentsTotal !== amountCents) {
      setValidationError(
        `Split amounts (${formatCents(splitCentsTotal)}) must sum to the total (${formatCents(amountCents)})`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data, error, response } = await apiClient.POST("/groups/{group_id}/expenses", {
        params: { path: { group_id: groupId } },
        body: {
          amount,
          currency,
          payer_id: payerId,
          splits: splitEntries.map((entry) => ({
            member_id: entry.member_id,
            amount: entry.raw,
          })),
        },
      });

      if (!response.ok || !data) {
        setSubmitError(extractErrorMessage(error) ?? "Failed to create expense");
        return;
      }

      onCreated(data);
      setAmount("");
      setSplitInputs({});
    } catch {
      setSubmitError("Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add expense</h3>

      <label>
        Amount
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          required
        />
      </label>

      <label>
        Currency
        <input value={currency} onChange={(event) => setCurrency(event.target.value)} required />
      </label>

      <label>
        Payer
        <select
          value={payerId}
          onChange={(event) =>
            setPayerId(event.target.value === "" ? "" : Number(event.target.value))
          }
          required
        >
          <option value="">Select payer</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Splits</legend>
        {members.map((member) => (
          <label key={member.id}>
            {member.name}
            <input
              value={splitInputs[member.id] ?? ""}
              onChange={(event) => updateSplit(member.id, event.target.value)}
              inputMode="decimal"
            />
          </label>
        ))}
      </fieldset>

      {validationError && <p role="alert">{validationError}</p>}
      {submitError && <p role="alert">{submitError}</p>}

      <button type="submit" disabled={submitting}>
        Add expense
      </button>
    </form>
  );
}
