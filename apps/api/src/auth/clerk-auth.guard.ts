import { verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../prisma/prisma.service';

export type AuthenticatedRequest = FastifyRequest & {
  auth?: {
    userId: string;
    clerkUserId: string;
  };
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!token || !secretKey) {
      throw new UnauthorizedException('Authentication is required.');
    }

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

      const user = await this.prisma.user.upsert({
        where: { clerkId: clerkUserId },
        update: {},
        create: { clerkId: clerkUserId },
        select: { id: true },
      });

      request.auth = { userId: user.id, clerkUserId };

      return true;
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
}
