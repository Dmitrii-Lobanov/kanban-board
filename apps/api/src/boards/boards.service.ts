import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';


@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.board.findMany({
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
        title: true,
        position: true,
        createdAt: true,
      },
    });
  }
}