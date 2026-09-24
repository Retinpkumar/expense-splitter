import { useState, type FormEvent } from "react";
import { apiClient } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import type { Expense, Member } from "../api/types";

type Props = {
  groupId: number;
  members: Member[];
  onCreated: (expense: Expense) => void;
};

// Plain decimal literal, at most 2 fractional digits — rejects hex/
// scientific notation, leading "+", "Infinity"/"NaN", and other
// numeric-literal forms JS's Number() would otherwise accept but the
// backend's Decimal(12,2) column would reject or silently truncate.
// Restricting to whole cents also keeps toCents() exact: with no more
// than 2 decimal digits, Math.round(value * 100) never needs to correct
// a float-representation error, so summing already-rounded cents (rather
// than summing raw floats and rounding once) can't drift for any input
// this pattern accepts.
const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Parses a decimal-string amount, or null if invalid/empty. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  return DECIMAL_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

/** Converts a dollar amount (at most 2 decimal digits) to integer cents. */
function toCents(value: number): number {
  return Math.round(value * 100);
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

    const amountValue = parseAmount(amount);
    const amountCents = amountValue === null ? null : toCents(amountValue);
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
      const value = parseAmount(entry.raw);
      if (value === null) {
        setValidationError("Split amounts must be numbers");
        return;
      }
      const cents = toCents(value);
      if (cents <= 0) {
        setValidationError("Split amounts must be greater than zero");
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
