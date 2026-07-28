import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TaskPriority,
  WorkspaceRole,
  type Prisma as PrismaTypes,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { mapTaskResponse } from '../boards/board-response.mapper';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type TransactionClient = PrismaTypes.TransactionClient;

type TaskPositionSnapshot = {
  id: string;
  columnId: string;
  position: number;
  version: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async createTask(userId: string, dto: CreateTaskDto) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const task = await this.prisma.$transaction(
          async (transaction) => {
            const column = await transaction.column.findFirst({
              where: {
                id: dto.columnId,
                board: {
                  workspace: {
                    members: {
                      some: {
                        userId,
                        role: {
                          in: [WorkspaceRole.OWNER, WorkspaceRole.MEMBER],
                        },
                      },
                    },
                  },
                },
              },
              select: { id: true },
            });

            if (!column) {
              throw new NotFoundException('Column not found.');
            }

            const position = await transaction.task.count({
              where: { columnId: column.id },
            });

            return transaction.task.create({
              data: {
                title: dto.title.trim(),
                description: dto.description?.trim() || null,
                priority: dto.priority ?? TaskPriority.MEDIUM,
                columnId: column.id,
                position,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return mapTaskResponse(task);
      } catch (error) {
        if (this.isRetryableCreateConflict(error)) {
          if (attempt < 2) {
            continue;
          }

          throw new ConflictException(
            'Unable to create task. Please try again.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException('Unable to create task. Please try again.');
  }

  async deleteTask(
    userId: string,
    taskId: string,
    dto: DeleteTaskDto,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const task = await transaction.task.findFirst({
          where: {
            id: taskId,
            column: {
              board: {
                workspace: {
                  members: {
                    some: {
                      userId,
                      role: {
                        in: [WorkspaceRole.OWNER, WorkspaceRole.MEMBER],
                      },
                    },
                  },
                },
              },
            },
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
          throw new ConflictException(
            'Task has been modified by another client.',
          );
        }

        const deletion = await transaction.task.deleteMany({
          where: { id: task.id, version: dto.expectedVersion },
        });

        if (deletion.count !== 1) {
          throw new ConflictException(
            'Task has been modified by another client.',
          );
        }

        const tasksToShift = await transaction.task.findMany({
          where: {
            columnId: task.columnId,
            position: { gt: task.position },
          },
          select: { id: true, position: true },
          orderBy: { position: 'asc' },
        });

        for (const taskToShift of tasksToShift) {
          await transaction.task.update({
            where: { id: taskToShift.id },
            data: { position: taskToShift.position - 1 },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          board: {
            workspace: {
              members: {
                some: {
                  userId,
                  role: { in: [WorkspaceRole.OWNER, WorkspaceRole.MEMBER] },
                },
              },
            },
          },
        },
      },
      select: { id: true, version: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    if (task.version !== dto.expectedVersion) {
      throw new ConflictException('Task has been modified by another client.');
    }

    const update = await this.prisma.task.updateMany({
      where: { id: task.id, version: dto.expectedVersion },
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        priority: dto.priority,
        version: { increment: 1 },
      },
    });

    if (update.count !== 1) {
      throw new ConflictException('Task has been modified by another client.');
    }

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    });

    return mapTaskResponse(updatedTask);
  }

  async moveTask(userId: string, taskId: string, dto: MoveTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          board: {
            workspace: {
              members: {
                some: {
                  userId,
                  role: { in: [WorkspaceRole.OWNER, WorkspaceRole.MEMBER] },
                },
              },
            },
          },
        },
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

    const destinationColumn = await this.prisma.column.findFirst({
      where: {
        id: dto.columnId,
        board: {
          columns: {
            some: { id: task.columnId },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!destinationColumn) {
      throw new NotFoundException('Destination column not found.');
    }

    const movedTask = await this.prisma.$transaction(async (transaction) => {
      const versionClaim = await transaction.task.updateMany({
        where: {
          id: task.id,
          version: dto.expectedVersion,
        },
        data: {
          position: -task.position - 1,
          version: {
            increment: 1,
          },
        },
      });

      if (versionClaim.count !== 1) {
        throw new ConflictException(
          'Task has been modified by another client.',
        );
      }

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

  private isRetryableCreateConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    );
  }
}
