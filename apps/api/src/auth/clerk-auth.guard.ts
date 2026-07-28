import { createClerkClient, verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../prisma/prisma.service';
import { UserOnboardingService } from './user-onboarding.service';

export type AuthenticatedRequest = FastifyRequest & {
  auth?: {
    userId: string;
    clerkUserId: string;
  };
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: UserOnboardingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!token || !secretKey) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const clerkUserId = await this.verifyClerkToken(token, secretKey);
    const user = await this.prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: {},
      create: { clerkId: clerkUserId },
      select: { id: true, displayName: true, email: true },
    });

    if (!user.displayName || !user.email) {
      await this.syncClerkProfile(user.id, clerkUserId, secretKey);
    }

    await this.onboarding.ensureStarterWorkspace(user.id);

    request.auth = { userId: user.id, clerkUserId };

    return true;
  }

  private async verifyClerkToken(
    token: string,
    secretKey: string,
  ): Promise<string> {
    try {
      const payload = await verifyToken(token, {
        secretKey,
        authorizedParties: (
          process.env.CLERK_AUTHORIZED_PARTIES ?? 'http://localhost:5173'
        )
          .split(',')
          .map((origin) => origin.trim()),
      });
      const clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new UnauthorizedException('Authentication is required.');
      }

      return clerkUserId;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired authentication.');
    }
  }

  private readBearerToken(authorization: string | undefined): string | null {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length).trim() || null;
  }

  private async syncClerkProfile(
    userId: string,
    clerkUserId: string,
    secretKey: string,
  ): Promise<void> {
    try {
      const clerk = createClerkClient({ secretKey });
      const profile = await clerk.users.getUser(clerkUserId);
      const email = profile.primaryEmailAddress?.emailAddress ?? null;
      const fullName = [profile.firstName, profile.lastName]
        .filter((value): value is string => Boolean(value))
        .join(' ');
      const displayName = fullName || profile.username || email;

      await this.prisma.user.update({
        where: { id: userId },
        data: { email, displayName },
      });
    } catch {
      this.logger.warn(
        `Unable to synchronize Clerk profile for ${clerkUserId}`,
      );
    }
  }
}
