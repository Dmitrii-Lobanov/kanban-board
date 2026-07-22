import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async moveTask(taskId: string, dto: MoveTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException();
    }

    if (task.version !== dto.expectedVersion) {
      throw new ConflictException('Task has been modified by another client.');
    }

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        columnId: dto.columnId,
        position: dto.position,
        version: {
          increment: 1,
        },
      },
    });
  }
}
