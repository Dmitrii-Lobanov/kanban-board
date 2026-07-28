import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, BoardsModule, TasksModule],
})
export class AppModule {}
