import type { BoardResponse, ColumnKey } from '@kanban-board/contracts';
import { ColumnKey as PrismaColumnKey, type Prisma } from '@prisma/client';

export type BoardWithColumnsAndTasks = Prisma.BoardGetPayload<{
  include: {
    columns: {
      include: {
        tasks: true;
      };
    };
  };
}>;

const apiColumnKeys: Record<PrismaColumnKey, ColumnKey> = {
  [PrismaColumnKey.TODO]: 'todo',
  [PrismaColumnKey.IN_PROGRESS]: 'in-progress',
  [PrismaColumnKey.DONE]: 'done',
};

export function mapBoardResponse(
  board: BoardWithColumnsAndTasks,
): BoardResponse {
  return {
    id: board.id,
    title: board.title,
    position: board.position,
    workspaceId: board.workspaceId,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    columns: board.columns.map((column) => ({
      id: column.id,
      title: column.title,
      key: apiColumnKeys[column.key],
      position: column.position,
      boardId: column.boardId,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
      tasks: column.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        position: task.position,
        version: task.version,
        columnId: task.columnId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    })),
  };
}
