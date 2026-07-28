import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from './boards.service';

describe('BoardsService', () => {
  let prisma: PrismaService;
  let service: BoardsService;

  beforeEach(() => {
    prisma = new PrismaService();
    service = new BoardsService(prisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns only boards in workspaces the user belongs to', async () => {
    const findMany = jest.spyOn(prisma.board, 'findMany').mockResolvedValue([]);

    await expect(service.findAll('user-1')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspace: {
            members: {
              some: { userId: 'user-1' },
            },
          },
        },
      }),
    );
  });
});
