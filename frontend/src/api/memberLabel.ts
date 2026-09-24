import type { Member } from "./types";

/** Returns a lookup that resolves a member id to its name, falling back to "member {id}". */
export function makeMemberLabel(members: Member[]): (memberId: number) => string {
  return (memberId) => members.find((member) => member.id === memberId)?.name ?? `member ${memberId}`;
}
