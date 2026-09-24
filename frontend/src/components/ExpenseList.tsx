import type { Expense } from "../api/types";

type Props = {
  expenses: Expense[];
  memberLabel: (memberId: number) => string;
};

export function ExpenseList({ expenses, memberLabel }: Props) {
  return (
    <ul>
      {expenses.map((expense) => (
        <li key={expense.id}>
          {expense.amount} {expense.currency} paid by {memberLabel(expense.payer_id)} (
          {expense.splits.map((split) => `${memberLabel(split.member_id)}: ${split.amount}`).join(", ")}
          )
        </li>
      ))}
    </ul>
  );
}
