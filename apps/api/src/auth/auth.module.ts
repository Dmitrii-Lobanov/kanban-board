import { Global, Module } from '@nestjs/common';

import { ClerkAuthGuard } from './clerk-auth.guard';
import { UserOnboardingService } from './user-onboarding.service';

@Global()
@Module({
  providers: [ClerkAuthGuard, UserOnboardingService],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
