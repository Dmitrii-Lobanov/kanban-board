import { Controller, Get, UseGuards } from '@nestjs/common';

import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUserId } from '../auth/current-user-id.decorator';
import { BoardsService } from './boards.service';

@Controller('boards')
@UseGuards(ClerkAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.boardsService.findAll(userId);
  }
}
