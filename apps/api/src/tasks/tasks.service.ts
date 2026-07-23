import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { mapTaskResponse } from '../boards/board-response.mapper';
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

    const movedTask = await this.prisma.$transaction(async (transaction) => {
      const destinationTaskCount = await transaction.task.count({
        where: {
          columnId: dto.columnId,
          id: {
            not: task.id,
          },
        },
      });

      const destinationPosition = Math.min(dto.position, destinationTaskCount);

      await transaction.task.update({
        where: {
          id: task.id,
        },
        data: {
          position: -task.position - 1,
        },
      });

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

    return mapTaskResponse(movedTask);
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
      const tasksToShift = await transaction.task.findMany({
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
        select: {
          id: true,
          position: true,
        },
        orderBy: {
          position: 'desc',
        },
      });

      for (const taskToShift of tasksToShift) {
        await transaction.task.update({
          where: {
            id: taskToShift.id,
          },
          data: {
            position: taskToShift.position + 1,
          },
        });
      }

      return;
    }

    const tasksToShift = await transaction.task.findMany({
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
      select: {
        id: true,
        position: true,
      },
      orderBy: {
        position: 'asc',
      },
    });

    for (const taskToShift of tasksToShift) {
      await transaction.task.update({
        where: {
          id: taskToShift.id,
        },
        data: {
          position: taskToShift.position - 1,
        },
      });
    }
  }

  private async moveAcrossColumns(
    transaction: TransactionClient,
    task: TaskPositionSnapshot,
    destinationColumnId: string,
    destinationPosition: number,
  ): Promise<void> {
    const sourceTasksToShift = await transaction.task.findMany({
      where: {
        columnId: task.columnId,
        position: {
          gt: task.position,
        },
      },
      select: {
        id: true,
        position: true,
      },
      orderBy: {
        position: 'asc',
      },
    });

    for (const taskToShift of sourceTasksToShift) {
      await transaction.task.update({
        where: {
          id: taskToShift.id,
        },
        data: {
          position: taskToShift.position - 1,
        },
      });
    }

    const destinationTasksToShift = await transaction.task.findMany({
      where: {
        columnId: destinationColumnId,
        position: {
          gte: destinationPosition,
        },
      },
      select: {
        id: true,
        position: true,
      },
      orderBy: {
        position: 'desc',
      },
    });

    for (const taskToShift of destinationTasksToShift) {
      await transaction.task.update({
        where: {
          id: taskToShift.id,
        },
        data: {
          position: taskToShift.position + 1,
        },
      });
    }
  }
}
