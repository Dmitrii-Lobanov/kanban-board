import { Injectable } from '@nestjs/common';
import { ColumnKey, WorkspaceRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const starterColumns = [
  { key: ColumnKey.TODO, title: 'Todo', position: 0 },
  { key: ColumnKey.IN_PROGRESS, title: 'In Progress', position: 1 },
  { key: ColumnKey.DONE, title: 'Done', position: 2 },
] as const;

@Injectable()
export class UserOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureStarterWorkspace(userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (membership) {
      return;
    }

    const workspaceId = `personal-${userId}`;
    const boardId = `starter-${userId}`;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.workspace.upsert({
        where: { id: workspaceId },
        update: {},
        create: {
          id: workspaceId,
          name: 'My Workspace',
        },
      });

      await transaction.workspaceMember.upsert({
        where: {
          userId_workspaceId: { userId, workspaceId },
        },
        update: { role: WorkspaceRole.OWNER },
        create: {
          userId,
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      await transaction.board.upsert({
        where: { id: boardId },
        update: {},
        create: {
          id: boardId,
          title: 'My Kanban Board',
          position: 0,
          workspaceId,
        },
      });

      for (const column of starterColumns) {
        await transaction.column.upsert({
          where: { id: `${column.key.toLowerCase()}-${userId}` },
          update: {},
          create: {
            id: `${column.key.toLowerCase()}-${userId}`,
            boardId,
            ...column,
          },
        });
      }
    });
  }
}
