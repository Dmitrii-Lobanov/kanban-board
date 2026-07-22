import { Module } from '@nestjs/common';

import { BoardsModule } from './boards/boards.module';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, BoardsModule, TasksModule],
})
export class AppModule {}
