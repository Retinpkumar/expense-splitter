import type { components } from "./schema";

export type Group = components["schemas"]["GroupRead"];
export type Member = components["schemas"]["MemberRead"];
export type Expense = components["schemas"]["ExpenseRead"];
export type ExpenseSplit = components["schemas"]["ExpenseSplitRead"];
export type BalanceEntry = components["schemas"]["BalanceEntry"];
export type Balances = Record<string, BalanceEntry[]>;
