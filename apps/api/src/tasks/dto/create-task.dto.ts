import type { CreateTaskRequest } from '@kanban-board/contracts';
import { TaskPriority } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateTaskDto implements CreateTaskRequest {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  columnId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @IsNotEmpty()
  assigneeId?: string | null;
}
