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
});
