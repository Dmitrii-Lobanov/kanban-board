import { Body, Controller, Param, Patch } from '@nestjs/common';

import { MoveTaskDto } from './dto/move-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Patch(':taskId/position')
  moveTask(@Param('taskId') taskId: string, @Body() dto: MoveTaskDto) {
    return this.tasksService.moveTask(taskId, dto);
  }
}
