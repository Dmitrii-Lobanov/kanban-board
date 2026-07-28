import type { DeleteTaskRequest } from '@kanban-board/contracts';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DeleteTaskDto implements DeleteTaskRequest {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
