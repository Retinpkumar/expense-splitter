---
name: code-review
description: Perform a high-signal code review of a diff or pull request that surfaces meaningful defects (correctness, data integrity, security, contracts, concurrency, reliability, unnecessary complexity) while staying silent on style, naming, and speculative concerns. Use this whenever asked to review a PR, review a diff, review code changes, or give feedback on a commit or branch before merge.
---

# Code Review Skill

## Purpose

Perform high-signal code reviews that surface meaningful defects while
avoiding style nitpicks, speculative concerns, and unnecessary redesign.

The goal is **not** to find as many comments as possible. The goal is to
find the smallest set of issues most likely to matter. **A review with
zero findings is a valid and successful outcome.**

---

## Core Principles

### 1. Review the diff, not the world

Start with the changed code. Use surrounding code, callers, tests,
configuration, schemas, and documentation only when necessary to
understand behavior or verify a finding. Do not review unrelated
existing code merely because it could be improved.

### 2. Default to silence on style

Do not comment on formatting, naming preferences, import ordering,
minor structural preferences, personal coding style, refactoring
preferences, or anything already reliably caught by linters/formatters.

Comment only when style or structure creates a meaningful correctness,
security, maintainability, or readability problem — one that could
realistically cause a future defect.

### 3. Prioritize by consequence, not cleverness

Rough priority order:

1. Incorrect behavior
2. Data loss or corruption
3. Security or privacy vulnerabilities
4. Broken API or system contracts
5. Transaction or consistency failures
6. Realistic concurrency problems
7. Resource leaks or operational failures
8. Significant unnecessary complexity
9. Everything else

### 4. Require a concrete execution path

Never report a problem merely because it's theoretically possible.
Before reporting a bug, establish: what input/state triggers it, which
code path is involved, what actually goes wrong, and why it matters.

Avoid comments based solely on "might," "could," "possibly," or "in
theory," unless the repository provides evidence the scenario is
realistic.

> **Rule:** No hypothetical bug without a plausible mechanism.

### 5. Verify assumptions before commenting

Inspect callers, callees, interfaces, types, schemas, configuration,
tests, documentation, API contracts, and existing error handling as
needed. Do not invent requirements. If a finding depends on an
assumption that can't be established, downgrade confidence or stay
silent.

---

## High-Value Review Areas

| Area | Look for | Key question |
|---|---|---|
| **Correctness** | Wrong results, incorrect state transitions/calculations/branching/defaults/validation, unexpected behavior on valid input | — |
| **Data integrity** | Partial writes, incorrect transactions, duplicate/lost/corrupted records, incorrect migrations, non-idempotent retries, inconsistent related records | Can this leave the system in a state that should be impossible? |
| **API & contract compatibility** | Silent changes to input requirements, output meaning, error behavior, defaults, ordering, nullability, serialization, auth requirements, backward compatibility | Is a locally-reasonable implementation still violating an existing contract? |
| **Error handling** | Swallowed errors, exceptions converted to success, incorrect fallback, lost error context, partial failure without recovery, retries that duplicate side effects | Is the failure scenario realistic, and is the recovery appropriate? |
| **Concurrency** | Race conditions, check-then-act bugs, lost updates, duplicate processing, incorrect locking/isolation, shared mutable state | Can this code path actually execute concurrently? |
| **Resource management** | DB connections, files, streams, locks, transactions, network connections, temp resources | Can the resource lifecycle actually cause a problem here? |
| **Security & privacy** | Auth/authz bypass, sensitive-data exposure, injection, unsafe deserialization, credential leakage, insecure defaults, missing access controls, trust-boundary violations | Is there a concrete risk, not just a general best-practice gap? |
| **Boundary conditions** | Null/missing values, empty collections, zero, negative values, min/max, malformed input, expired state, time boundaries, partial responses, external-service failures | Can this state actually occur in this system? |

Do not manufacture edge cases that can't occur in this system.

---

## Over-Engineering Is a Legitimate Finding

Look for unreachable branches, defensive checks for impossible states,
unnecessary abstractions, duplicate validation, premature
generalization, unnecessary retries/fallbacks, excessive indirection,
and complex state machines for simple behavior.

Prefer **deleting** unnecessary complexity over adding more guards.

| Case | Action |
|---|---|
| Real edge case | Handle it |
| Impossible edge case | Remove the handling |
| Unverified edge case | Investigate before commenting |

---

## Tests

Do not request tests automatically. Ask for additional tests only when
the change introduces meaningful behavior or regression risk that
isn't adequately verified. Prefer behavioral tests over tests written
solely to increase coverage.

- ❌ "Add more tests."
- ✅ "This now accepts an empty batch, but the only test covers
  non-empty batches, and the empty case takes a different persistence
  path."

---

## Complexity vs. Correctness

Don't suggest a simpler implementation merely because it looks nicer —
first establish that the complexity causes a meaningful problem.

- ❌ "This could be simplified."
- ✅ "This adds three fallback branches for states that cannot occur
  after the validation above, making the actual failure path harder to
  follow."

---

## Don't Rewrite the Author's Solution

Identify problems rather than imposing personal architectural
preferences. Suggest a specific fix only when it directly addresses the
finding and is reasonably obvious.

- ❌ "I would use a factory here."
- ✅ "This constructor now has four independent modes, and callers can
  create combinations the class cannot correctly handle."

---

## Finding Quality Bar

Every finding must answer two questions: **What is wrong?** and **Why
does it matter?**

- ❌ "Potential null issue here."
- ✅ "`user_id` can be absent on the import path, but `.strip()` now
  runs before validation, turning an expected validation error into a
  500."

**Confidence test:** Would I be comfortable blocking a PR over this? If
no, it probably doesn't belong in the main review. Never manufacture
findings to avoid an empty review.

---

## Finding Classification

Classify each candidate internally as one of:

- **BUG** — produces incorrect behavior
- **DATA_LOSS** — can lose, corrupt, duplicate, or inconsistently persist data
- **SECURITY** — concrete security or privacy vulnerability
- **CONTRACT** — violates an existing API, database, or behavioral contract
- **RELIABILITY** — realistic failure, concurrency, resource, or operational problem
- **COMPLEXITY** — substantial unnecessary complexity
- **PREFERENCE** — a different implementation would just be "nicer"

**Never report `PREFERENCE` findings.**

---

## Review Procedure

1. **Understand the change** — what changed, why, what behavior is
   intended, what's affected. Don't start commenting yet.
2. **Establish the contract** — inspect callers, interfaces, tests,
   schemas, docs, configuration, existing behavior. Determine what must
   remain true.
3. **Trace important paths** — input → validation → business logic →
   persistence/output; success, failure, retry, and relevant concurrent
   paths. Trace only as deep as needed.
4. **Look for high-impact failures** — correctness, data integrity,
   contracts, security, failure handling, concurrency, resource
   lifecycle, realistic boundaries.
5. **Challenge complexity** — is every branch reachable, every guard
   necessary, every abstraction justified, every fallback possible,
   every retry necessary? Prefer simpler code when complexity has no
   demonstrated purpose.
6. **Validate candidate findings** — verify the execution path, the
   assumption, and the consequence. Check whether existing code or
   tests already prevent/cover it, and whether this change actually
   introduced or exposed it. Discard weak findings.
7. **Rank internally** by impact, confidence, likelihood, and scope.
   Don't expose an overall score or ranking to the reader.
8. **Apply the 5-finding cap** — if more than 5 survive, keep the
   highest-value ones (see Comment Limits below).
9. **Final silence check** — for each remaining comment: if removed,
   does the author lose information that materially improves
   correctness, security, reliability, or maintainability? If not,
   remove it.

---

## Comment Limits

**Hard maximum: 5 findings.** If more than 5 potential issues exist:

1. Keep the highest-impact findings.
2. Prefer correctness over maintainability.
3. Prefer concrete evidence over speculation.
4. Combine closely related findings only when they describe the same
   underlying problem.
5. Don't create multiple comments to enumerate symptoms of one bug.

A smaller number of strong findings beats a long review.

---

## Comment Style

Each finding: **one or two sentences.** State the problem directly.

**Format:** `[Problem]. [Consequence or concrete reason it matters.]`

**Example:**
> This update happens outside the transaction that creates the order.
> If the second write fails, the order exists without its corresponding
> payment record.

**Never include:** greetings, preambles, generic praise, long
explanations, repeated code, tutorials, unnecessary background,
"Consider...", "It might be worth...", "I think...", or personal
preference framing.

---

## Output Format

For each finding:

```
[P<priority>] <file>:<line>

<one or two sentence explanation>
```

| Priority | Meaning |
|---|---|
| **P0** | Immediate/blocking correctness, security, or data-loss issue |
| **P1** | Significant bug or reliability/contract issue |
| **P2** | Meaningful but lower-impact issue |
| **P3** | Minor issue that still has concrete value (never used for style) |

Don't assign a priority merely to make the review look complete.

**When there are no findings, return exactly:**
```
No high-confidence issues found.
```
No praise, no summary, nothing else appended.

---

## What Not To Do

Never:
- Nitpick formatting
- Debate naming without a concrete consequence
- Request tests automatically
- Invent requirements
- Report impossible edge cases
- Speculate about failures without a mechanism
- Recommend abstractions merely because they're familiar
- Rewrite working code to match personal preference
- Repeat linter feedback
- Summarize the entire pull request
- Praise every change
- Manufacture findings to fill the comment quota
- Exceed the 5-finding cap

---

## Guiding Principle

Be difficult to impress and easy to convince. Require concrete evidence
before raising an issue. Prefer silence over speculation, and deleting
unnecessary complexity over adding defensive complexity. Prefer five
useful comments over twenty mediocre ones — the objective is maximum
useful signal per comment, not maximum review coverage.
