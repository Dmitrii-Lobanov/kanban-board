# Decision 001: Server-authoritative synchronization

Status: selected design; implementation and verification remain incomplete.

## Requirements

See ../SYNCHRONIZATION_CONTRACT.md:

- S2: independent field changes survive.
- S3: competing same-field changes have an explicit conflict outcome.
- S4: concurrent moves preserve card identity, location, and ordering.
- S5: disconnected clients retain drafts and recover uncertain operations.
- S6: retries do not repeat committed effects.
- S7: edits cannot resurrect deleted cards.

## Decision

PostgreSQL holds authoritative committed board state.

Clients submit operations describing intent and the state on which
that intent was based.

The server:

1. Authenticates the caller and checks workspace access.
2. Validates operation preconditions against current state.
3. Atomically commits the accepted change or rejects it.
4. Returns an explicit outcome.
5. Makes committed changes available for synchronization.

Clients maintain confirmed state separately from optimistic operations
and unsaved drafts.

A local optimistic change is provisional until its outcome is confirmed.

## Why this fits the scope

We need explicit acceptance and rejection based on business rules.

Examples:

- A stale title edit can conflict while an independent priority edit succeeds.
- Two moves of the same card from the same move revision conflict.
- A move cannot silently follow an anchor into another column.
- An edit cannot recreate a deleted card.
- Current membership controls access.

New mutations are not queued while the client knows it is disconnected.
Persistent offline editing is outside the initial scope.

## Alternative: CRDT-based collaboration

We considered a replicated model that merges concurrent changes.

That approach would require selecting and validating merge semantics for:

- Card fields.
- Ordered lists.
- Moves between columns.
- Deletion versus modification.
- Authorization and rejected operations.

Automatic convergence alone would not establish our business invariants.

We are not introducing CRDTs for this scope. We would reconsider them
if requirements expand to extensive offline editing, peer collaboration,
or collaborative rich text.

## Responsibilities

PostgreSQL provides transactions, constraints, and locking mechanisms.
The application must choose the transaction boundaries and concurrency
rules that make those mechanisms enforce our contract.

Prisma provides database access and transaction APIs.
It does not define our conflict policy or retry identity.

React provides rendering and optimistic UI facilities.
It does not establish whether a remote operation committed.

The application implements:

- Field and move preconditions.
- Transaction coordination for ordering changes.
- Operation identity and outcome retention.
- Atomic persistence of changes and synchronization records.
- Replay and snapshot recovery.
- Optimistic reconciliation.
- Recoverable conflict UI.
- Subscription and replay authorization.

## Trade-offs

- New writes require server availability.
- Clients may temporarily display provisional state.
- Conflicts require explicit user resolution.
- Correct ordering may serialize competing board mutations.
- Throughput limits must be measured rather than assumed.
- Recovery behavior adds client and server complexity.

## Decisions deferred

- Locking strategy and transaction isolation.
- Field-revision storage.
- Board-revision allocation.
- SSE versus WebSockets.
- Change-log and operation-outcome retention.
- Production hosting for synchronization connections.

## Verification

This decision is not evidence that the guarantees are implemented.

Baseline tests document current behavior.
Each implementation step must replace relevant defect-expecting
assertions with assertions for the target behavior.
