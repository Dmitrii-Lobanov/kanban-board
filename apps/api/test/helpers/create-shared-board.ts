import { ColumnKey, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createSharedBoard(prisma: PrismaService) {
  return prisma.$transaction(async (transaction) => {
    const alice = await transaction.user.create({
      data: { displayName: 'Alice' },
    });
    const bob = await transaction.user.create({
      data: { displayName: 'Bob' },
    });
    const outsider = await transaction.user.create({
      data: { displayName: 'Outsider' },
    });

    const workspace = await transaction.workspace.create({
      data: {
        name: 'Synchronization test workspace',
        members: {
          create: [
            { userId: alice.id, role: WorkspaceRole.OWNER },
            { userId: bob.id, role: WorkspaceRole.MEMBER },
          ],
        },
      },
    });

    const board = await transaction.board.create({
      data: {
        title: 'Shared board',
        position: 0,
        workspaceId: workspace.id,
      },
    });

    const todo = await transaction.column.create({
      data: {
        title: 'Todo',
        key: ColumnKey.TODO,
        position: 0,
        boardId: board.id,
      },
    });
    const progress = await transaction.column.create({
      data: {
        title: 'In Progress',
        key: ColumnKey.IN_PROGRESS,
        position: 1,
        boardId: board.id,
      },
    });
    const done = await transaction.column.create({
      data: {
        title: 'Done',
        key: ColumnKey.DONE,
        position: 2,
        boardId: board.id,
      },
    });

    const tasks = [];

    for (const [position, title] of ['A', 'B', 'C'].entries()) {
      tasks.push(
        await transaction.task.create({
          data: { title, position, columnId: todo.id },
        }),
      );
    }

    return {
      alice,
      bob,
      outsider,
      workspace,
      board,
      columns: { todo, progress, done },
      tasks,
    };
  });
}

export type SharedBoardFixture = Awaited<ReturnType<typeof createSharedBoard>>;

export async function deleteSharedBoard(
  prisma: PrismaService,
  fixture: SharedBoardFixture,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.workspace.delete({
      where: { id: fixture.workspace.id },
    });

    await transaction.user.deleteMany({
      where: {
        id: {
          in: [fixture.alice.id, fixture.bob.id, fixture.outsider.id],
        },
      },
    });
  });
}
