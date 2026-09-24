import { useState, type FormEvent } from "react";
import { apiClient } from "../api/client";
import { extractErrorMessage } from "../api/errors";

type Group = { id: number; name: string };
type Member = { id: number; name: string };

export function GroupPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

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
        </section>
      )}
    </main>
  );
}
