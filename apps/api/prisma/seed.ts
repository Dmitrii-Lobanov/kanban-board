import {
  ColumnKey,
  PrismaClient,
  TaskPriority,
  WorkspaceRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      passwordHash: 'demo',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
    },
  });

  await prisma.workspaceMember.create({
    data: {
      role: WorkspaceRole.OWNER,
      userId: user.id,
      workspaceId: workspace.id,
    },
  });

  const board = await prisma.board.create({
    data: {
      title: 'Product Development',
      position: 0,
      workspaceId: workspace.id,
    },
  });

  const backlog = await prisma.column.create({
    data: {
      title: 'Backlog',
      key: ColumnKey.TODO,
      position: 0,
      boardId: board.id,
    },
  });

  const progress = await prisma.column.create({
    data: {
      title: 'In Progress',
      key: ColumnKey.IN_PROGRESS,
      position: 1,
      boardId: board.id,
    },
  });

  const done = await prisma.column.create({
    data: {
      title: 'Done',
      key: ColumnKey.DONE,
      position: 2,
      boardId: board.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Design REST API',
        position: 0,
        priority: TaskPriority.HIGH,
        columnId: backlog.id,
      },
      {
        title: 'Implement Prisma layer',
        position: 1,
        priority: TaskPriority.MEDIUM,
        columnId: backlog.id,
      },
      {
        title: 'Implement optimistic updates',
        position: 0,
        priority: TaskPriority.HIGH,
        columnId: progress.id,
      },
      {
        title: 'Create deployment pipeline',
        position: 0,
        priority: TaskPriority.LOW,
        columnId: done.id,
      },
    ],
  });

  console.log('Database seeded');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });