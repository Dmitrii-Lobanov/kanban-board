/// <reference types="jest" />

import { ConflictException, NotFoundException } from '@nestjs/common';
import { BoardsService } from '../src/boards/boards.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TasksService } from '../src/tasks/tasks.service';
import { assertBoardInvariants } from './helpers/assert-board-invariants';
import {
  createSharedBoard,
  deleteSharedBoard,
  type SharedBoardFixture,
} from './helpers/create-shared-board';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl || new URL(testDatabaseUrl).pathname !== '/kanban_test') {
  throw new Error('TEST_DATABASE_URL must target kanban_test.');
}

describe('shared board access', () => {
  const prisma = new PrismaService({
    datasources: { db: { url: testDatabaseUrl } },
  });
  const boards = new BoardsService(prisma);
  const tasks = new TasksService(prisma);

  let fixture: SharedBoardFixture | undefined;

  function currentFixture(): SharedBoardFixture {
    if (!fixture) {
      throw new Error('Fixture has not been created.');
    }

    return fixture;
  }

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    fixture = await createSharedBoard(prisma);
  });

  afterEach(async () => {
    if (fixture) {
      await deleteSharedBoard(prisma, fixture);
      fixture = undefined;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows Alice and Bob to read the same complete board', async () => {
    const f = currentFixture();

    for (const user of [f.alice, f.bob]) {
      const visibleBoards = await boards.findAll(user.id);
      const board = visibleBoards.find((item) => item.id === f.board.id);

      if (!board) {
        throw new Error(`${user.displayName} cannot see the board.`);
      }

      assertBoardInvariants(board);

      const actualIds = board.columns
        .flatMap((column) => column.tasks.map((task) => task.id))
        .sort();
      const expectedIds = f.tasks.map((task) => task.id).sort();

      expect(actualIds).toEqual(expectedIds);
    }
  });

  it.each(['alice', 'bob'] as const)(
    'allows %s to move a card',
    async (actor) => {
      const f = currentFixture();
      const task = f.tasks[0];

      await tasks.moveTask(f[actor].id, task.id, {
        columnId: f.columns.progress.id,
        position: 0,
        expectedVersion: task.version,
      });

      const saved = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });

      expect(saved.columnId).toBe(f.columns.progress.id);
    },
  );

  it('hides the board from the outsider', async () => {
    const f = currentFixture();

    const visibleBoards = await boards.findAll(f.outsider.id);

    expect(visibleBoards.map((board) => board.id)).not.toContain(f.board.id);
  });

  it('rejects an outsider move without changing any cards', async () => {
    const f = currentFixture();
    const task = f.tasks[0];

    const readTasks = () =>
      prisma.task.findMany({
        where: { column: { boardId: f.board.id } },
        orderBy: { id: 'asc' },
      });

    const before = await readTasks();

    await expect(
      tasks.moveTask(f.outsider.id, task.id, {
        columnId: f.columns.progress.id,
        position: 0,
        expectedVersion: task.version,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(await readTasks()).toEqual(before);
  });

  it('baseline: rejects an independent priority edit after a title edit', async () => {
    const f = currentFixture();
    const original = f.tasks[0];

    // Both users prepare their edits from the same observed state.
    const aliceRequest = {
      title: 'Updated by Alice',
      description: original.description,
      priority: original.priority,
      assigneeId: original.assigneeId,
      expectedVersion: original.version,
    };

    const bobRequest = {
      title: original.title,
      description: original.description,
      priority: 'HIGH' as const,
      assigneeId: original.assigneeId,
      expectedVersion: original.version,
    };

    await tasks.updateTask(f.alice.id, original.id, aliceRequest);

    await expect(
      tasks.updateTask(f.bob.id, original.id, bobRequest),
    ).rejects.toBeInstanceOf(ConflictException);

    const saved = await prisma.task.findUniqueOrThrow({
      where: { id: original.id },
    });

    expect(saved.title).toBe('Updated by Alice');
    expect(saved.priority).toBe(original.priority);
    expect(saved.version).toBe(original.version + 1);
  });

  it('baseline: retrying a committed move returns a conflict', async () => {
    const f = currentFixture();
    const original = f.tasks[0];

    const request = {
      columnId: f.columns.progress.id,
      position: 0,
      expectedVersion: original.version,
    };

    // The server commits. Deliberately discard its response to model
    // the client receiving no acknowledgement.
    await tasks.moveTask(f.alice.id, original.id, request);

    const readBoardTasks = () =>
      prisma.task.findMany({
        where: { column: { boardId: f.board.id } },
        orderBy: { id: 'asc' },
      });

    // This database read is a test observation, not client knowledge.
    const afterCommit = await readBoardTasks();
    const committedTask = afterCommit.find((task) => task.id === original.id);

    expect(committedTask).toMatchObject({
      columnId: f.columns.progress.id,
      position: 0,
      version: original.version + 1,
    });

    // Alice retries with exactly the original payload.
    await expect(
      tasks.moveTask(f.alice.id, original.id, request),
    ).rejects.toBeInstanceOf(ConflictException);

    // The retry must not alter any card, including shifted neighbors.
    expect(await readBoardTasks()).toEqual(afterCommit);

    const visibleBoards = await boards.findAll(f.alice.id);
    const board = visibleBoards.find((item) => item.id === f.board.id);

    if (!board) {
      throw new Error('Fixture board is missing.');
    }

    assertBoardInvariants(board);

    expect(
      board.columns
        .flatMap((column) => column.tasks.map((task) => task.id))
        .sort(),
    ).toEqual(f.tasks.map((task) => task.id).sort());
  });

  it('baseline: overlapping moves leave a gap after a stale position read', async () => {
    const f = currentFixture();
    const cardA = f.tasks[0];
    const cardB = f.tasks[1];
    const cardC = f.tasks[2];
    let intercepted = false;

    // Only Alice uses this client. Queries still reach real PostgreSQL.
    const aliceClient = prisma.$extends({
      query: {
        task: {
          async findFirst({ args, query }) {
            const snapshot = await query(args);

            if (!intercepted && args.where?.id === cardB.id) {
              intercepted = true;

              // Alice has read B, but moveTask has not received that
              // snapshot yet. Let Bob finish moving A in between.
              await tasks.moveTask(f.bob.id, cardA.id, {
                columnId: f.columns.done.id,
                position: 0,
                expectedVersion: cardA.version,
              });

              const currentB = await prisma.task.findUniqueOrThrow({
                where: { id: cardB.id },
              });

              expect(currentB.position).toBe(0);
              expect(currentB.version).toBe(cardB.version);
            }

            // Return Alice's original snapshot, not a fresh read.
            return snapshot;
          },
        },
      },
    });

    // Test-only adapter: TasksService uses Prisma query methods, while
    // the extended client lacks PrismaService's Nest lifecycle methods.
    const aliceTasks = new TasksService(
      aliceClient as unknown as PrismaService,
    );

    await aliceTasks.moveTask(f.alice.id, cardB.id, {
      columnId: f.columns.progress.id,
      position: 0,
      expectedVersion: cardB.version,
    });

    expect(intercepted).toBe(true);

    const savedTasks = await prisma.task.findMany({
      where: { column: { boardId: f.board.id } },
    });

    // No card disappeared or was duplicated.
    expect(savedTasks.map((task) => task.id).sort()).toEqual(
      f.tasks.map((task) => task.id).sort(),
    );

    expect(savedTasks.find((task) => task.id === cardA.id)).toMatchObject({
      columnId: f.columns.done.id,
      position: 0,
    });
    expect(savedTasks.find((task) => task.id === cardB.id)).toMatchObject({
      columnId: f.columns.progress.id,
      position: 0,
    });

    // This is the defect: the only remaining Todo card is at position 1.
    expect(savedTasks.find((task) => task.id === cardC.id)).toMatchObject({
      columnId: f.columns.todo.id,
      position: 1,
    });

    const visibleBoards = await boards.findAll(f.alice.id);
    const board = visibleBoards.find((item) => item.id === f.board.id);

    if (!board) {
      throw new Error('Fixture board is missing.');
    }

    expect(() => assertBoardInvariants(board)).toThrow(
      'positions must be unique and contiguous from zero',
    );
  });

  it('rejects a stale edit without resurrecting a deleted card', async () => {
    const f = currentFixture();
    const original = f.tasks[1];

    // Alice prepares her draft before Bob deletes the card.
    const aliceRequest = {
      title: 'Alice wants to keep this text',
      description: original.description,
      priority: original.priority,
      assigneeId: original.assigneeId,
      expectedVersion: original.version,
    };

    await tasks.deleteTask(f.bob.id, original.id, {
      expectedVersion: original.version,
    });

    const readBoardTasks = () =>
      prisma.task.findMany({
        where: { column: { boardId: f.board.id } },
        orderBy: { id: 'asc' },
      });

    const afterDelete = await readBoardTasks();

    await expect(
      tasks.updateTask(f.alice.id, original.id, aliceRequest),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      await prisma.task.findUnique({
        where: { id: original.id },
      }),
    ).toBeNull();

    // Rejection must not change any surviving cards.
    expect(await readBoardTasks()).toEqual(afterDelete);

    const visibleBoards = await boards.findAll(f.alice.id);
    const board = visibleBoards.find((item) => item.id === f.board.id);

    if (!board) {
      throw new Error('Fixture board is missing.');
    }

    assertBoardInvariants(board);

    const actualIds = board.columns
      .flatMap((column) => column.tasks.map((task) => task.id))
      .sort();

    const expectedIds = f.tasks
      .filter((task) => task.id !== original.id)
      .map((task) => task.id)
      .sort();

    expect(actualIds).toEqual(expectedIds);
  });

  it('initializes all field and move revisions to one', () => {
    const f = currentFixture();

    expect(f.tasks).toHaveLength(3);

    for (const task of f.tasks) {
      expect(task).toMatchObject({
        titleRevision: 1,
        descriptionRevision: 1,
        priorityRevision: 1,
        assigneeRevision: 1,
        moveRevision: 1,
      });
    }
  });
});
