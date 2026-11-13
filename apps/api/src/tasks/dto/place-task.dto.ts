import type { PlaceTaskRequest } from '@kanban-board/contracts';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class PlaceTaskDto implements PlaceTaskRequest {
  @IsString()
  @Matches(/\S/)
  columnId!: string;

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @Matches(/\S/)
  beforeTaskId!: string | null;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedMoveRevision!: number;
}
