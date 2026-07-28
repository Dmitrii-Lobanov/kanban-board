import { ColumnKey, WorkspaceRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UserOnboardingService } from './user-onboarding.service';

const timestamp = new Date('2026-07-28T12:00:00.000Z');

describe('UserOnboardingService', () => {
  let prisma: PrismaService;
  let service: UserOnboardingService;

  beforeEach(() => {
    prisma = new PrismaService();
    service = new UserOnboardingService(prisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('leaves existing workspace members unchanged', async () => {
    jest.spyOn(prisma.workspaceMember, 'findFirst').mockResolvedValue({
      id: 'membership-1',
      role: WorkspaceRole.MEMBER,
      userId: 'user-1',
      workspaceId: 'workspace-1',
    });
    const transaction = jest.spyOn(prisma, '$transaction');

    await service.ensureStarterWorkspace('user-1');

    expect(transaction).not.toHaveBeenCalled();
  });

  it('creates an empty starter board for a user without a workspace', async () => {
    jest.spyOn(prisma.workspaceMember, 'findFirst').mockResolvedValue(null);
    const workspaceUpsert = jest
      .spyOn(prisma.workspace, 'upsert')
      .mockResolvedValue({
        id: 'personal-user-1',
        name: 'My Workspace',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    const membershipUpsert = jest
      .spyOn(prisma.workspaceMember, 'upsert')
      .mockResolvedValue({
        id: 'membership-1',
        role: WorkspaceRole.OWNER,
        userId: 'user-1',
        workspaceId: 'personal-user-1',
      });
    const boardUpsert = jest.spyOn(prisma.board, 'upsert').mockResolvedValue({
      id: 'starter-user-1',
      title: 'My Kanban Board',
      position: 0,
      workspaceId: 'personal-user-1',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const columnUpsert = jest.spyOn(prisma.column, 'upsert').mockResolvedValue({
      id: 'todo-user-1',
      title: 'Todo',
      key: ColumnKey.TODO,
      position: 0,
      boardId: 'starter-user-1',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback) => callback(prisma));

    await service.ensureStarterWorkspace('user-1');

    expect(workspaceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'personal-user-1' } }),
    );
    expect(membershipUpsert).toHaveBeenCalledTimes(1);
    expect(membershipUpsert.mock.calls[0]?.[0].create.role).toBe(
      WorkspaceRole.OWNER,
    );
    expect(boardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'starter-user-1' } }),
    );
    expect(columnUpsert).toHaveBeenCalledTimes(3);
    expect(columnUpsert.mock.calls.map(([query]) => query.create.key)).toEqual([
      ColumnKey.TODO,
      ColumnKey.IN_PROGRESS,
      ColumnKey.DONE,
    ]);
  });
});
