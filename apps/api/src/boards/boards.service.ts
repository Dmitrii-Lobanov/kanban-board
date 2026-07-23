import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapBoardResponse } from './board-response.mapper';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const boards = await this.prisma.board.findMany({
      orderBy: {
        position: 'asc',
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
          include: {
            tasks: {
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
      },
    });

    return boards.map(mapBoardResponse);
  }
}
