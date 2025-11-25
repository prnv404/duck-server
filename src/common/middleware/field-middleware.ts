import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql';

// Uppercase field middleware
export const upperCaseMiddleware: FieldMiddleware = async (ctx: MiddlewareContext, next: NextFn) => {
    const value = await next();
    return typeof value === 'string' ? value.toUpperCase() : value;
};

// Logging field middleware
export const loggerMiddleware: FieldMiddleware = async (ctx: MiddlewareContext, next: NextFn) => {
    const { info } = ctx;
    console.log(`Resolving field: ${info.parentType.name}.${info.fieldName}`);
    const startTime = Date.now();
    const value = await next();
    const duration = Date.now() - startTime;
    console.log(`Resolved in ${duration}ms`);
    return value;
};
