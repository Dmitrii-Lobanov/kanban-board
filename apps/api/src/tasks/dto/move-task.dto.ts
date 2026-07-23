import { IsInt, IsString, Min } from 'class-validator';
import type { MoveTaskRequest } from '@kanban-board/contracts';

export class MoveTaskDto implements MoveTaskRequest {
  @IsString()
  columnId!: string;

  @IsInt()
  @Min(0)
  position!: number;

  @IsInt()
  expectedVersion!: number;
}
