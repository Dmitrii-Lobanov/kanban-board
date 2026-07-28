import type { UpdateTaskRequest } from '@kanban-board/contracts';
import { TaskPriority } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto implements UpdateTaskRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @IsNotEmpty()
  assigneeId?: string | null;
}
