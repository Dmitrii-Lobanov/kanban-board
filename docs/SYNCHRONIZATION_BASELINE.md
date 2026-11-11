# Synchronization baseline

Baseline commit: 7312068e6e79cdaebdf82adc69cc2b5ec5d196b5

Requirements: [Synchronization contract](./SYNCHRONIZATION_CONTRACT.md)

CI run:
https://github.com/Dmitrii-Lobanov/kanban-board/actions/runs/43085452051

Execution status: verified by the linked CI integration test run.

## Purpose

Record the behavior of the original implementation before changing
the synchronization protocol.

A passing baseline test can reproduce a defect. It does not necessarily
mean the corresponding target requirement is satisfied.

## Test conditions

- Real PostgreSQL with the committed Prisma migrations.
- One board with three columns and three initial cards.
- Alice is the workspace owner; Bob is a member.
- A third user has no workspace membership.
- Tests call NestJS services directly.
- Each test receives a fresh fixture.
- No browser, Clerk token verification, or HTTP transport is exercised.

## Evidence matrix

References below point to apps/api/test/shared-board.integration-spec.ts
at the baseline commit.

| Area                     | Test reference | Asserted behavior                                                | Execution status |
| ------------------------ | -------------- | ---------------------------------------------------------------- | ---------------- |
| Shared reads             | Line 56        | Alice and Bob can read the complete board                        | Pending          |
| Member writes            | Line 78        | Alice and Bob can each move a card                               | Pending          |
| Unauthorized reads       | Line 98        | The outsider cannot see the board                                | Pending          |
| Unauthorized moves       | Line 106       | The outsider's move is rejected without changes                  | Pending          |
| Independent edits, S2    | Line 129       | A priority edit conflicts after an unrelated title edit          | Pending          |
| Lost acknowledgement, S6 | Line 165       | Retrying a committed move conflicts without repeating its effect | Pending          |
| Concurrent ordering, S4  | Line 219       | A controlled stale read produces a position gap                  | Pending          |
| Deletion before edit, S7 | Line 309       | A stale edit cannot recreate a deleted card                      | Pending          |

## How failures are reproduced

### Independent field edits

Both requests are prepared from the same task version.
Alice's title edit commits before Bob's priority edit is submitted.

The baseline test expects Bob's edit to conflict.
This demonstrates conflict detection that is too coarse for S2.
It does not demonstrate a silent overwrite.

### Lost acknowledgement

The test lets the move commit and discards its returned response.
It then retries the identical request.

The baseline test expects a conflict and no additional database change.
This models missing acknowledgement at the service boundary.
It does not inject an actual network failure.

### Stale ordering snapshot

A Prisma query extension intercepts Alice's completed card read.
Bob's move commits before that snapshot is returned to Alice's service.
Alice then continues using the stale position.

The baseline test expects both moves to complete and the remaining
column to contain a position gap.

This controls request interleaving without sleeps.
It does not require overlapping database transactions.

### Deletion before edit

Alice prepares an edit before Bob deletes the card.
After deletion commits, Alice submits her stale edit.

The test expects rejection, no resurrection, no changes to surviving
cards, and valid remaining positions.

## Not established by this baseline

- Real-time delivery to another browser.
- Same-field conflict resolution with recoverable drafts.
- Browser recovery after connection loss.
- Durable operation outcomes and replay after server restart.
- Authorization for subscriptions and replay.
- Deletion between an edit's database read and write.
- Correctness under every concurrent move interleaving.
- Synchronization latency, throughput, or recovery measurements.

## Reproduce locally

Start the dedicated test database:

    docker compose --profile test up -d --wait postgres-test

Apply migrations:

    DATABASE_URL='postgresql://kanban:kanban@localhost:5434/kanban_test?schema=public' npm exec --workspace @kanban-board/api -- prisma migrate deploy

Run the baseline suite:

    TEST_DATABASE_URL='postgresql://kanban:kanban@localhost:5434/kanban_test?schema=public' npm run test:integration --workspace @kanban-board/api -- --testPathPatterns=shared-board

Expected suite size: 9 tests.

## Updating this record

After inspecting successful test output:

- Record the execution environment and result.
- Mark access and deletion checks as covered and passing.
- Mark independent edits, retry ambiguity, and ordering gaps as
  reproduced failures of the target contract.

As implementation changes:

- Preserve this document as the historical baseline.
- Replace defect-expecting assertions with target-behavior assertions.
- Record new evidence against the new implementation commit.
