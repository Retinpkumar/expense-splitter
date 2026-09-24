import { useState, type FormEvent } from "react";
import { apiClient } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import type { Expense, Group, Member } from "../api/types";
import { ExpenseForm } from "../components/ExpenseForm";

export function GroupPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    setGroupError(null);
    setCreatingGroup(true);

    try {
      const { data, error, response } = await apiClient.POST("/groups", {
        body: { name: groupNameInput },
      });

      if (!response.ok || !data) {
        setGroupError(extractErrorMessage(error) ?? "Failed to create group");
        return;
      }

      setGroup(data);
      setMembers([]);
      setGroupNameInput("");
    } catch {
      setGroupError("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    if (!group) return;

    setMemberError(null);
    setAddingMember(true);

    try {
      const { data, error, response } = await apiClient.POST("/groups/{group_id}/members", {
        params: { path: { group_id: group.id } },
        body: { name: memberNameInput },
      });

      if (!response.ok || !data) {
        setMemberError(extractErrorMessage(error) ?? "Failed to add member");
        return;
      }

      setMembers((previous) => [...previous, data]);
      setMemberNameInput("");
    } catch {
      setMemberError("Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  return (
    <main>
      <h1>Groups</h1>

      {!group && (
        <form onSubmit={handleCreateGroup}>
          <label>
            Group name
            <input
              value={groupNameInput}
              onChange={(event) => setGroupNameInput(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={creatingGroup}>
            Create group
          </button>
          {groupError && <p role="alert">{groupError}</p>}
        </form>
      )}

      {group && (
        <section>
          <h2>{group.name}</h2>

          <form onSubmit={handleAddMember}>
            <label>
              Member name
              <input
                value={memberNameInput}
                onChange={(event) => setMemberNameInput(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={addingMember}>
              Add member
            </button>
            {memberError && <p role="alert">{memberError}</p>}
          </form>

          <ul>
            {members.map((member) => (
              <li key={member.id}>{member.name}</li>
            ))}
          </ul>

          {members.length > 0 && (
            <ExpenseForm
              groupId={group.id}
              members={members}
              onCreated={(expense) => setExpenses((previous) => [...previous, expense])}
            />
          )}

          {expenses.length > 0 && (
            <section>
              <h3>Expenses</h3>
              <ul>
                {expenses.map((expense) => (
                  <li key={expense.id}>
                    {expense.amount} {expense.currency} paid by{" "}
                    {members.find((member) => member.id === expense.payer_id)?.name ??
                      `member ${expense.payer_id}`}{" "}
                    (
                    {expense.splits
                      .map(
                        (split) =>
                          `${members.find((member) => member.id === split.member_id)?.name ?? `member ${split.member_id}`}: ${split.amount}`,
                      )
                      .join(", ")}
                    )
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
