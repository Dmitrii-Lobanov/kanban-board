import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapBoardResponse } from './board-response.mapper';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const boards = await this.prisma.board.findMany({
      where: {
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, displayName: true, email: true },
                },
              },
            },
          },
        },
        columns: {
          orderBy: {
            position: 'asc',
          },
          include: {
            tasks: {
              orderBy: {
                position: 'asc',
              },
              include: {
                assignee: {
                  select: { id: true, displayName: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    return boards.map(mapBoardResponse);
  }
}
