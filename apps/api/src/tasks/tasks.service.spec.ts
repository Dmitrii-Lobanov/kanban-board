import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ColumnKey,
  TaskPriority,
  WorkspaceRole,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

const timestamp = new Date('2026-07-27T12:00:00.000Z');

function createTask(
  overrides: Partial<Prisma.TaskGetPayload<object>> = {},
): Prisma.TaskGetPayload<object> {
  return {
    id: 'task-1',
    title: 'Task',
    description: null,
    priority: TaskPriority.MEDIUM,
    position: 1,
    version: 3,
    columnId: 'column-source',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function createColumn(
  overrides: Partial<Prisma.ColumnGetPayload<object>> = {},
): Prisma.ColumnGetPayload<object> {
  return {
    id: 'column-destination',
    title: 'Column',
    key: ColumnKey.DONE,
    position: 0,
    boardId: 'board-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('TasksService', () => {
  let prisma: PrismaService;
  let service: TasksService;

  beforeEach(() => {
    prisma = new PrismaService();
    service = new TasksService(prisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a missing task', async () => {
    const findFirst = jest
      .spyOn(prisma.task, 'findFirst')
      .mockResolvedValue(null);

    await expect(
      service.moveTask('user-1', 'missing-task', {
        columnId: 'column-destination',
        position: 0,
        expectedVersion: 1,
      }),
    ).rejects.toThrow(new NotFoundException('Task not found.'));
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'missing-task',
          column: {
            board: {
              workspace: {
                members: {
                  some: {
                    userId: 'user-1',
                    role: {
                      in: [WorkspaceRole.OWNER, WorkspaceRole.MEMBER],
                    },
                  },
                },
              },
            },
          },
        },
      }),
    );
  });

  it('rejects a stale task version before starting a transaction', async () => {
    jest
      .spyOn(prisma.task, 'findFirst')
      .mockResolvedValue(createTask({ position: 0, version: 4 }));
    const transaction = jest.spyOn(prisma, '$transaction');

    await expect(
      service.moveTask('user-1', 'task-1', {
        columnId: 'column-destination',
        position: 0,
        expectedVersion: 3,
      }),
    ).rejects.toThrow(
      new ConflictException('Task has been modified by another client.'),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing destination column', async () => {
    jest
      .spyOn(prisma.task, 'findFirst')
      .mockResolvedValue(createTask({ position: 0, version: 1 }));
    const findDestination = jest
      .spyOn(prisma.column, 'findFirst')
      .mockResolvedValue(null);

    await expect(
      service.moveTask('user-1', 'task-1', {
        columnId: 'missing-column',
        position: 0,
        expectedVersion: 1,
      }),
    ).rejects.toThrow(new NotFoundException('Destination column not found.'));
    expect(findDestination).toHaveBeenCalledWith({
      where: {
        id: 'missing-column',
        board: {
          columns: {
            some: { id: 'column-source' },
          },
        },
      },
      select: { id: true },
    });
  });

  it('rejects a version changed after the initial read', async () => {
    jest.spyOn(prisma.task, 'findFirst').mockResolvedValue(createTask());
    jest.spyOn(prisma.column, 'findFirst').mockResolvedValue(createColumn());
    jest.spyOn(prisma.task, 'updateMany').mockResolvedValue({ count: 0 });
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback) => callback(prisma));

    await expect(
      service.moveTask('user-1', 'task-1', {
        columnId: 'column-destination',
        position: 1,
        expectedVersion: 3,
      }),
    ).rejects.toThrow(
      new ConflictException('Task has been modified by another client.'),
    );
  });

  it('moves across columns in collision-safe order', async () => {
    const movedTask = createTask({
      columnId: 'column-destination',
      position: 1,
      version: 4,
    });
    const update = jest
      .spyOn(prisma.task, 'update')
      .mockResolvedValue(movedTask);

    jest.spyOn(prisma.task, 'findFirst').mockResolvedValue(createTask());
    jest.spyOn(prisma.column, 'findFirst').mockResolvedValue(createColumn());
    const updateMany = jest
      .spyOn(prisma.task, 'updateMany')
      .mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.task, 'count').mockResolvedValue(2);
    jest
      .spyOn(prisma.task, 'findMany')
      .mockResolvedValueOnce([
        createTask({ id: 'source-2', position: 2 }),
        createTask({ id: 'source-3', position: 3 }),
      ])
      .mockResolvedValueOnce([
        createTask({
          id: 'destination-1',
          columnId: 'column-destination',
        }),
      ]);
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback) => callback(prisma));

    const response = await service.moveTask('user-1', 'task-1', {
      columnId: 'column-destination',
      position: 1,
      expectedVersion: 3,
    });

    expect(update.mock.calls.map(([argument]) => argument)).toEqual([
      { where: { id: 'source-2' }, data: { position: 1 } },
      { where: { id: 'source-3' }, data: { position: 2 } },
      { where: { id: 'destination-1' }, data: { position: 2 } },
      {
        where: { id: 'task-1' },
        data: {
          columnId: 'column-destination',
          position: 1,
        },
      },
    ]);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', version: 3 },
      data: { position: -2, version: { increment: 1 } },
    });
    expect(response).toMatchObject({
      id: 'task-1',
      columnId: 'column-destination',
      position: 1,
      version: 4,
    });
  });

  it('moves backward within a column by shifting tasks from high to low', async () => {
    const movedTask = createTask({ position: 0, version: 4 });
    const update = jest
      .spyOn(prisma.task, 'update')
      .mockResolvedValue(movedTask);

    jest
      .spyOn(prisma.task, 'findFirst')
      .mockResolvedValue(createTask({ position: 2 }));
    jest
      .spyOn(prisma.column, 'findFirst')
      .mockResolvedValue(
        createColumn({ id: 'column-source', key: ColumnKey.TODO }),
      );
    jest.spyOn(prisma.task, 'count').mockResolvedValue(2);
    const updateMany = jest
      .spyOn(prisma.task, 'updateMany')
      .mockResolvedValue({ count: 1 });
    jest
      .spyOn(prisma.task, 'findMany')
      .mockResolvedValue([
        createTask({ id: 'task-at-1' }),
        createTask({ id: 'task-at-0', position: 0 }),
      ]);
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback) => callback(prisma));

    await service.moveTask('user-1', 'task-1', {
      columnId: 'column-source',
      position: 0,
      expectedVersion: 3,
    });

    expect(update.mock.calls.map(([argument]) => argument)).toEqual([
      { where: { id: 'task-at-1' }, data: { position: 2 } },
      { where: { id: 'task-at-0' }, data: { position: 1 } },
      {
        where: { id: 'task-1' },
        data: {
          columnId: 'column-source',
          position: 0,
        },
      },
    ]);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', version: 3 },
      data: { position: -3, version: { increment: 1 } },
    });
  });
});
