// import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
// import { Request } from 'express';
// import * as backend from '@clerk/backend';
// import { Reflector } from '@nestjs/core';
// import { GqlExecutionContext } from '@nestjs/graphql';
// import { UserRepo } from 'src/repos';

// @Injectable()
// export class ClerkAuthGuard implements CanActivate {
//     constructor(
//         @Inject('ClerkClient')
//         private readonly clerkClient: backend.ClerkClient,
//         private readonly reflector: Reflector,
//         private readonly user_repo: UserRepo,
//     ) {}

//     async canActivate(context: ExecutionContext): Promise<boolean> {
//         const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()]);
//         if (isPublic) return true; // skip auth

//         let request: Request;

//         if (context.getType() === 'http') {
//             request = context.switchToHttp().getRequest<Request>();
//         } else {
//             const gqlCtx = GqlExecutionContext.create(context);
//             request = gqlCtx.getContext().req; // GraphQL puts it here
//         }

//         const authHeader = request.headers.authorization;
//         const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

//         if (!bearerToken) {
//             throw new UnauthorizedException('No authentication token provided');
//         }

//         try {
//             // Try to verify the token (either session or bearer)
//             const tokenToVerify = bearerToken;
//             const tokenPayload = await backend.verifyToken(tokenToVerify, {
//                 secretKey: process.env.CLERK_SECRET_KEY,
//             });

//             if (!tokenPayload) {
//                 throw new UnauthorizedException('Invalid session');
//             }

//             // const user = await this.clerkClient.users.getUser(tokenPayload.sub);

//             const user = await this.user_repo.findByClerkId(tokenPayload.sub);

//             if (!user) {
//                 throw new UnauthorizedException('User not found');
//             }

//             (request as any).user = user;

//             return true;
//         } catch (err) {
//             console.error('Token verification error:', err);
//             throw new UnauthorizedException('Invalid or expired token');
//         }
//     }
// }
