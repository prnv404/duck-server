import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Decorator to get current authenticated user from request
 * Works with both REST and GraphQL contexts
 */
export const CurrentUser = createParamDecorator((data: string | undefined, context: ExecutionContext) => {
    const contextType = context.getType<string>();

    let request: any;

    if (contextType === 'graphql') {
        const gqlContext = GqlExecutionContext.create(context);
        request = gqlContext.getContext().req;
    } else {
        request = context.switchToHttp().getRequest();
    }

    const user = request.user || request.auth;

    return data ? user?.[data] : user;
});

/**
 * Decorator to get current user ID
 */
export const CurrentUserId = createParamDecorator((data: unknown, context: ExecutionContext): string => {
    const contextType = context.getType<string>();

    let request: any;

    if (contextType === 'graphql') {
        const gqlContext = GqlExecutionContext.create(context);
        request = gqlContext.getContext().req;
    } else {
        request = context.switchToHttp().getRequest();
    }

    return request.auth?.userId || request.user?.id;
});
