import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';

/**
 * Role-based access control guard
 * Checks if user has required roles to access a route
 */
@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = this.getRequest(context);
        const user = request.user || request.auth;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        const userRole = user.role || user.orgRole || 'user';

        const hasRole = requiredRoles.some((role) => userRole === role);

        if (!hasRole) {
            this.logger.warn(`User ${user.userId} attempted to access resource requiring roles: ${requiredRoles.join(', ')}`);
            throw new ForbiddenException(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`);
        }

        return true;
    }

    /**
     * Extract request from different contexts (GraphQL, REST)
     */
    private getRequest(context: ExecutionContext) {
        const contextType = context.getType<string>();

        if (contextType === 'graphql') {
            const gqlContext = GqlExecutionContext.create(context);
            return gqlContext.getContext().req;
        }

        return context.switchToHttp().getRequest();
    }
}
