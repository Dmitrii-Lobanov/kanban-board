import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';

import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { MoveTaskDto } from './dto/move-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(ClerkAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Patch(':taskId/position')
  moveTask(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.moveTask(userId, taskId, dto);
  }
}
