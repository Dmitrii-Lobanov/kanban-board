# Decision 002: Field-level edit preconditions

Status: selected request design; not yet implemented by the API.

## Request semantics

An edit contains only the fields the user deliberately changed.

Each included field supplies:

- The proposed value.
- The field revision observed when the user began editing that field.

Omitted fields remain unchanged.
Explicit null clears description or assignee.
Title and priority cannot be null.

The server rejects:

- An empty changes object.
- Unknown fields.
- Invalid values.
- Missing, non-integer, or non-positive expected revisions.

TypeScript types do not replace runtime validation.

## Revision semantics

Each editable field has its own revision, initially 1.

An accepted edit increments the revision of each included field.
Unchanged, omitted fields keep their revisions.

An accepted explicit write increments its field revision even if its
normalized value equals the current value.

Moving a card does not change its editable-field revisions.
Editing details does not change its move revision.

Field revisions never reset or decrease during a card's lifetime.

## Atomic edits

A request changing multiple fields is all-or-nothing.

The server checks every included field revision.
If any precondition fails, no field in the request is updated.

Validation and updates must occur in one coordinated transaction.
A read followed by an unprotected write is insufficient.

## Examples

Alice changes title from title revision 1.
Bob changes priority from priority revision 1.

Both can succeed:

- Title revision becomes 2.
- Priority revision becomes 2.
- Both proposed values survive.

Alice and Bob both change title from title revision 1.

Only one distinct request succeeds:

- The accepted write advances title revision to 2.
- The other request conflicts.

Alice changes title and priority in one request.
Bob has already changed priority.

Alice's entire request conflicts:

- Her title is not partially saved.
- Her draft remains recoverable.

## Why revisions instead of comparing old values?

A value can change and later return to its original value.

For example: Low becomes High, then becomes Low again.

Comparing values alone would miss those intervening edits.
A monotonically increasing revision detects them.

## Client responsibility

The draft retains the revisions from its editing baseline.

Receiving a server refresh must not silently replace those revisions.
Otherwise stale input could overwrite changes the user never reviewed.

Explicit conflict resolution creates a new attempt using the reviewed
current state.

## Relationship to other versions

The existing task-wide version remains useful for whole-card changes
and deletion preconditions during migration.

Field revisions answer a different question:
has this particular field been explicitly written since the client
observed it?

Operation identity and durable retry outcomes will be added in Epic 3.

## Rollout

1. Add the new shared types.
2. Add field revisions to database storage and read responses.
3. Implement runtime validation and atomic edit handling.
4. Migrate the frontend to changed-field requests and draft baselines.
5. Replace the independent-edit baseline test with success assertions.
6. Remove the old full-form update contract after migration.
