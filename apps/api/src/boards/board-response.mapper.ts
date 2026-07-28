import type {
  BoardResponse,
  ColumnKey,
  TaskResponse,
  WorkspaceMemberResponse,
} from '@kanban-board/contracts';
import { ColumnKey as PrismaColumnKey, type Prisma } from '@prisma/client';

export type BoardWithColumnsAndTasks = Prisma.BoardGetPayload<{
  include: {
    columns: {
      include: {
        tasks: {
          include: {
            assignee: {
              select: { id: true; displayName: true; email: true };
            };
          };
        };
      };
    };
    workspace: {
      include: {
        members: {
          include: {
            user: {
              select: { id: true; displayName: true; email: true };
            };
          };
        };
      };
    };
  };
}>;

const apiColumnKeys: Record<PrismaColumnKey, ColumnKey> = {
  [PrismaColumnKey.TODO]: 'todo',
  [PrismaColumnKey.IN_PROGRESS]: 'in-progress',
  [PrismaColumnKey.DONE]: 'done',
};

type MemberRecord = Pick<
  Prisma.UserGetPayload<object>,
  'id' | 'displayName' | 'email'
>;

type TaskRecord = Prisma.TaskGetPayload<object> & {
  assignee?: MemberRecord | null;
};

function mapMemberResponse(member: MemberRecord): WorkspaceMemberResponse {
  return {
    id: member.id,
    displayName: member.displayName,
    email: member.email,
  };
}

export function mapTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    position: task.position,
    version: task.version,
    columnId: task.columnId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignee: task.assignee ? mapMemberResponse(task.assignee) : null,
  };
}

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
    members: board.workspace.members.map(({ user }) => mapMemberResponse(user)),
    columns: board.columns.map((column) => ({
      id: column.id,
      title: column.title,
      key: apiColumnKeys[column.key],
      position: column.position,
      boardId: column.boardId,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
      tasks: column.tasks.map(mapTaskResponse),
    })),
  };
}
