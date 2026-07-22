import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MoveTaskDto } from './dto/move-task.dto';

type TransactionClient = Prisma.TransactionClient;

type TaskPositionSnapshot = {
  id: string;
  columnId: string;
  position: number;
  version: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async moveTask(taskId: string, dto: MoveTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        columnId: true,
        position: true,
        version: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    if (task.version !== dto.expectedVersion) {
      throw new ConflictException('Task has been modified by another client.');
    }

    const destinationColumn = await this.prisma.column.findUnique({
      where: {
        id: dto.columnId,
      },
      select: {
        id: true,
      },
    });

    if (!destinationColumn) {
      throw new NotFoundException('Destination column not found.');
    }

    return this.prisma.$transaction(async (transaction) => {
      const destinationTaskCount = await transaction.task.count({
        where: {
          columnId: dto.columnId,
          id: {
            not: task.id,
          },
        },
      });

      const destinationPosition = Math.min(dto.position, destinationTaskCount);

      if (task.columnId === dto.columnId) {
        await this.moveWithinColumn(transaction, task, destinationPosition);
      } else {
        await this.moveAcrossColumns(
          transaction,
          task,
          dto.columnId,
          destinationPosition,
        );
      }

      return transaction.task.update({
        where: {
          id: task.id,
        },
        data: {
          columnId: dto.columnId,
          position: destinationPosition,
          version: {
            increment: 1,
          },
        },
      });
    });
  }

  private async moveWithinColumn(
    transaction: TransactionClient,
    task: TaskPositionSnapshot,
    destinationPosition: number,
  ): Promise<void> {
    if (task.position === destinationPosition) {
      return;
    }

    if (destinationPosition < task.position) {
      await transaction.task.updateMany({
        where: {
          columnId: task.columnId,
          id: {
            not: task.id,
          },
          position: {
            gte: destinationPosition,
            lt: task.position,
          },
        },
        data: {
          position: {
            increment: 1,
          },
        },
      });

      return;
    }

    await transaction.task.updateMany({
      where: {
        columnId: task.columnId,
        id: {
          not: task.id,
        },
        position: {
          gt: task.position,
          lte: destinationPosition,
        },
      },
      data: {
        position: {
          decrement: 1,
        },
      },
    });
  }

  private async moveAcrossColumns(
    transaction: TransactionClient,
    task: TaskPositionSnapshot,
    destinationColumnId: string,
    destinationPosition: number,
  ): Promise<void> {
    await transaction.task.updateMany({
      where: {
        columnId: task.columnId,
        position: {
          gt: task.position,
        },
      },
      data: {
        position: {
          decrement: 1,
        },
      },
    });

    await transaction.task.updateMany({
      where: {
        columnId: destinationColumnId,
        position: {
          gte: destinationPosition,
        },
      },
      data: {
        position: {
          increment: 1,
        },
      },
    });
  }
}
