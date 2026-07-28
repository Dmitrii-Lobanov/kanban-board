import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(ClerkAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Query() dto: DeleteTaskDto,
  ): Promise<void> {
    await this.tasksService.deleteTask(userId, taskId, dto);
  }

  @Post()
  createTask(@CurrentUserId() userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(userId, dto);
  }

  @Patch(':taskId/position')
  moveTask(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.moveTask(userId, taskId, dto);
  }

  @Patch(':taskId')
  updateTask(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(userId, taskId, dto);
  }
}
