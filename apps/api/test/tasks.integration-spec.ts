/// <reference types="jest" />
import { ColumnKey, TaskPriority } from '@prisma/client';

import { PrismaService } from '../src/prisma/prisma.service';
import { TasksService } from '../src/tasks/tasks.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for integration tests.');
}

if (new URL(testDatabaseUrl).pathname !== '/kanban_test') {
  throw new Error('Integration tests must use the kanban_test database.');
}

describe('TasksService integration', () => {
  const prisma = new PrismaService({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });
  const service = new TasksService(prisma);
  let workspaceId: string | undefined;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    if (workspaceId) {
      await prisma.workspace.delete({ where: { id: workspaceId } });
      workspaceId = undefined;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('moves a task across columns without violating unique positions', async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Cross-column integration test',
        boards: {
          create: {
            title: 'Board',
            position: 0,
            columns: {
              create: [
                {
                  title: 'Todo',
                  key: ColumnKey.TODO,
                  position: 0,
                  tasks: {
                    create: [
                      {
                        title: 'Moving task',
                        priority: TaskPriority.MEDIUM,
                        position: 0,
                      },
                      {
                        title: 'Source neighbor',
                        priority: TaskPriority.MEDIUM,
                        position: 1,
                      },
                    ],
                  },
                },
                {
                  title: 'In Progress',
                  key: ColumnKey.IN_PROGRESS,
                  position: 1,
                  tasks: {
                    create: {
                      title: 'Destination neighbor',
                      priority: TaskPriority.MEDIUM,
                      position: 0,
                    },
                  },
                },
              ],
            },
          },
        },
      },
      include: {
        boards: {
          include: {
            columns: {
              include: { tasks: true },
            },
          },
        },
      },
    });
    workspaceId = workspace.id;

    const columns = workspace.boards[0]?.columns;
    const sourceColumn = columns?.find(
      (column) => column.key === ColumnKey.TODO,
    );
    const destinationColumn = columns?.find(
      (column) => column.key === ColumnKey.IN_PROGRESS,
    );
    const movingTask = sourceColumn?.tasks.find(
      (task) => task.title === 'Moving task',
    );

    if (!sourceColumn || !destinationColumn || !movingTask) {
      throw new Error('Integration fixture was not created correctly.');
    }

    const response = await service.moveTask(movingTask.id, {
      columnId: destinationColumn.id,
      position: 0,
      expectedVersion: 1,
    });

    const [sourceTasks, destinationTasks] = await Promise.all([
      prisma.task.findMany({
        where: { columnId: sourceColumn.id },
        orderBy: { position: 'asc' },
      }),
      prisma.task.findMany({
        where: { columnId: destinationColumn.id },
        orderBy: { position: 'asc' },
      }),
    ]);

    expect(sourceTasks.map((task) => [task.title, task.position])).toEqual([
      ['Source neighbor', 0],
    ]);
    expect(destinationTasks.map((task) => [task.title, task.position])).toEqual(
      [
        ['Moving task', 0],
        ['Destination neighbor', 1],
      ],
    );
    expect(response).toMatchObject({
      columnId: destinationColumn.id,
      position: 0,
      version: 2,
    });
  });

  it('moves a task backward within a column', async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Within-column integration test',
        boards: {
          create: {
            title: 'Board',
            position: 0,
            columns: {
              create: {
                title: 'Todo',
                key: ColumnKey.TODO,
                position: 0,
                tasks: {
                  create: ['First', 'Second', 'Third'].map(
                    (title, position) => ({
                      title,
                      priority: TaskPriority.MEDIUM,
                      position,
                    }),
                  ),
                },
              },
            },
          },
        },
      },
      include: {
        boards: {
          include: {
            columns: {
              include: { tasks: true },
            },
          },
        },
      },
    });
    workspaceId = workspace.id;

    const column = workspace.boards[0]?.columns[0];
    const movingTask = column?.tasks.find((task) => task.title === 'Third');

    if (!column || !movingTask) {
      throw new Error('Integration fixture was not created correctly.');
    }

    await service.moveTask(movingTask.id, {
      columnId: column.id,
      position: 0,
      expectedVersion: 1,
    });

    const tasks = await prisma.task.findMany({
      where: { columnId: column.id },
      orderBy: { position: 'asc' },
    });

    expect(tasks.map((task) => [task.title, task.position])).toEqual([
      ['Third', 0],
      ['First', 1],
      ['Second', 2],
    ]);
  });
});
