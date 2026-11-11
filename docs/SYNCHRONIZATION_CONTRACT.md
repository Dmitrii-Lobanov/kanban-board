# Synchronization contract

Status: proposed requirements; not yet proven by tests.

## Scope

- Shared boards with authenticated workspace members.
- Card edits, moves, creation, and deletion.
- Temporary network disconnections.
- One backend instance and PostgreSQL.
- Pending operations and drafts survive disconnection within an open page.
- Persistence across page reloads or browser restarts is out of scope.
- Rich-text collaboration and multi-region infrastructure are out of scope.

## Definitions

- Committed: a change has successfully committed in PostgreSQL.
- Confirmed: the client has received evidence of that commit.
- Pending: an operation has been submitted without a definitive outcome.
- Uncertain: communication failed, so the client cannot tell whether
  the operation committed.
- Rejected: the server definitively refused the operation.
- Converged: clients with no unresolved local operations display the
  same committed board state after catching up.

An optimistic display is not proof of a commit.
A timeout is not proof of rejection.

## S1 — Move a card and notify another client

Given Alice and Bob have access to the same board,
when Alice moves a card:

- Alice sees the proposed move before the server response.
- The server validates and atomically commits or rejects the move.
- Bob receives the committed result.
- Alice eventually confirms the move or displays its rejection.
- An uncertain result remains distinguishable from a rejection.

Forbidden:

- Bob receives an uncommitted move as confirmed state.
- Alice permanently displays a rejected move as confirmed.

## S2 — Edit different fields concurrently

Given both clients observed the same card,
when Alice changes its title and Bob changes its priority:

- Both changes can commit if their respective preconditions remain valid.
- The final card contains Alice's title and Bob's priority.
- Unchanged form fields are not implicitly written.

Forbidden:

- One edit silently restores the other field's old value.
- An unrelated field change alone causes a conflict.

## S3 — Edit the same field concurrently

Given both clients edit the title from the same baseline:

- The first valid write accepted in the server's serialized order wins.
- The competing stale write is rejected as a conflict.
- The losing client retains its proposed title.
- The UI presents the current value and the rejected draft.
- Reapplying the draft requires an explicit user action and fresh
  preconditions; that attempt can conflict again.

Forbidden:

- Automatic overwrite of the winning value.
- Silent replacement of the draft's baseline during refresh.
- Loss of rejected input while the page remains open.

## S4 — Move cards concurrently

Status: chosen target policy; not implemented or proven.

### Placement intent

A move identifies:

- The card being moved.
- Its expected move revision.
- The destination column.
- An anchor card to place it immediately before, or null to append.

The server interprets placement against the current committed order
when it serializes the move, excluding the moving card itself.

Numeric positions remain an internal storage representation.

### Preconditions

- The user must have write access to the board.
- The moving card and destination column must exist on that board.
- The moving card's move revision must match the expected revision.
- A non-null anchor must exist in the destination column.
- A card cannot use itself as its anchor.

Invalid preconditions reject the operation without partial changes.

### Concurrent changes

- Moves are applied in a server-defined serialized order.
- The order is not determined by browser timestamps.
- Different-card moves may both succeed if their preconditions hold.
- Two distinct moves of the same card from the same move revision
  cannot both succeed.
- Editing a title or priority does not invalidate a move revision.
- Shifting a card's numeric position because another card moved does
  not invalidate its move revision.
- Each accepted distinct move increments the moved card's move revision,
  even if the resulting placement is unchanged.
- Retrying the same operation identity returns its recorded outcome;
  it does not increment the revision again.

### Anchor changes

- If the anchor moved within the destination column, use its current
  position.
- If the anchor was deleted or moved to another column, reject the move.
- Never silently append when an explicit anchor is unavailable.
- A null anchor means append to the current end of the column.

Placement is guaranteed at the moment the move commits.
Later accepted operations may change adjacency.

### Examples

Starting destination: [C]

Alice moves A before C.
Bob moves B before C.

If Alice's move is serialized first:

- After Alice: [A, C]
- After Bob: [A, B, C]

If Bob's move is serialized first:

- After Bob: [B, C]
- After Alice: [B, A, C]

Both final orders are valid.
All caught-up clients must display the actual committed order.

If Alice and Bob instead move the same card from the same move revision:

- One distinct move succeeds.
- The other conflicts.
- The rejected intent remains available for explicit retry after refresh.

### Structural guarantees

- Each committed move is atomic.
- Every live card has exactly one location.
- Column positions remain unique and contiguous from zero.
- Moves preserve the set of live card IDs.
- Rejected moves produce no partial ordering changes.

Forbidden:

- Duplicate cards, missing live cards, or invalid committed positions.
- Silently treating an ordering failure as a successful move.
- Automatically replacing a rejected move's preconditions and retrying
  it as if the user had approved the new state.

## S5 — Disconnect and recover

Status: chosen target policy; not implemented or proven.

### Connection states

- Connected: the client has established synchronization and caught up
  to the server's recovery boundary.
- Disconnected: synchronization is unavailable.
- Recovering: connectivity has returned, but catch-up is incomplete.
- Access blocked: authentication or authorization prevents recovery.

Connected does not guarantee that the next request will succeed.
Browser network indicators alone do not establish server availability.

### While disconnected or recovering

- Display the last confirmed board with a visible connection status.
- Keep drafts and unresolved operations in memory.
- Allow users to continue editing local drafts.
- Disable submission of new mutations.
- Do not create an offline queue of new operations.
- Label unresolved optimistic changes as unconfirmed.
- Do not treat a disconnected request as a definitive rejection.

Closing or reloading the page can lose drafts and pending-operation
tracking. Persistence across browser restarts is out of scope.

### Operation outcomes

- Pending: submitted, with no definitive outcome yet.
- Uncertain: communication failed before an outcome was established.
- Confirmed: evidence identifies this operation as committed.
- Rejected: a definitive server response establishes that this
  operation was not applied.

A timeout, aborted request, or generic server error is not sufficient
evidence of rejection.

An operation can be confirmed through its response, recorded outcome,
or a committed event carrying its identity.

### Recovery procedure

1. Re-establish authentication and verify current board access.
2. Obtain missing changes or a consistent replacement snapshot.
3. Reconcile uncertain operations using their original identities.
4. Retry only within the server's documented deduplication window,
   using the original payload and original preconditions.
5. Apply any further changes produced during reconciliation.
6. Resume new mutation submissions after catching up.

Transport retries may happen automatically.
Changing an operation's intent or preconditions requires explicit
user action and a new operation identity.

If outcome retention has expired, do not blindly resubmit an uncertain
operation. Explain that its original outcome cannot be established
and require manual review.

### Preserving user work

- Keep drafts separately from confirmed server state.
- A snapshot refresh must not discard drafts.
- A deleted card must not erase its locally retained draft.
- A conflict retains the rejected intent for explicit resolution.
- Access loss stops subscriptions, replay, and mutation retries.
- Access loss does not authorize further reads of server state.

### Recovery examples

Commit followed by connection loss:

- The server commits Alice's move.
- Alice receives no acknowledgement and marks it uncertain.
- Recovery finds the recorded outcome.
- Alice confirms the original move without applying it again.

Request never reaches the server:

- Alice marks the submitted move uncertain.
- Recovery retries the original operation safely.
- The server evaluates its original preconditions against current state.
- It either commits the move or rejects it explicitly.

### Forbidden outcomes

- Treating a timeout as proof that nothing committed.
- Replacing pending input silently with a fetched snapshot.
- Retrying with a new identity merely because a response was lost.
- Silently refreshing preconditions to force a stale operation through.
- Applying an old acknowledgement over newer confirmed board state.

## S6 — Commit succeeds but acknowledgement is lost

Given a move commits and its response is lost:

- Alice treats the operation as uncertain.
- A retry uses the same operation identity and payload.
- Within the documented retention period, the server returns the
  recorded outcome without applying the effect again.
- Reusing an identity with a different payload is rejected.
- The outcome remains recoverable after a backend restart.

Forbidden:

- A second committed effect caused by the retry.
- Claiming the original operation failed merely because its response
  did not arrive.

## S7 — Delete while another client edits

Given Bob's deletion commits before Alice's edit can be accepted:

- Alice's edit cannot recreate the card.
- Alice receives a definitive rejection when authorized to learn
  the outcome.
- Her draft remains available for copying or manual recovery.
- The deleted card disappears from confirmed board state.

If the edit commits first:

- The deletion follows its own documented conflict preconditions.
- A stale deletion may be rejected.
- The ordering of accepted operations remains inspectable.

Forbidden:

- Implicit upsert or resurrection of the deleted card.
- Silent loss of Alice's draft when the card component disappears.

## Global invariants

- Every live card belongs to one column on its board.
- With the current integer-position representation, committed positions
  in each column are unique and contiguous from zero.
- Rejected operations produce no partial domain changes.
- Accepted independent field changes are preserved.
- Retrying an operation does not repeat its committed effect.
- Deleted cards cannot be recreated by edits.
- Unauthorized users cannot read, mutate, subscribe to, or replay
  board changes.
- Convergence does not excuse violations of these rules.

## Evidence policy

Each scenario will be marked as:

- Not tested.
- Reproduced failure.
- Covered and passing under a stated test workload.

Passing tests establish evidence within their tested conditions.
They do not prove correctness under every possible execution.
