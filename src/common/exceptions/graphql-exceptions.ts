import { GraphQLError } from 'graphql';

export class CustomGraphQLError extends GraphQLError {
    constructor(message: string, code: string, statusCode: number = 400) {
        super(message, {
            extensions: {
                code,
                statusCode,
            },
        });
    }
}

export class NotFoundError extends CustomGraphQLError {
    constructor(resource: string, id?: string | number) {
        const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
        super(message, 'NOT_FOUND', 404);
    }
}

export class ValidationError extends CustomGraphQLError {
    constructor(message: string, fields?: Record<string, string[]>) {
        super(message, 'VALIDATION_ERROR', 400);
        if (fields) {
            this.extensions.fields = fields;
        }
    }
}

export class UnauthorizedError extends CustomGraphQLError {
    constructor(message: string = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401);
    }
}

export class ForbiddenError extends CustomGraphQLError {
    constructor(message: string = 'Forbidden') {
        super(message, 'FORBIDDEN', 403);
    }
}

export class BadRequestError extends CustomGraphQLError {
    constructor(message: string = 'Bad Request') {
        super(message, 'BAD_REQUEST', 400);
    }
}

export class InternalServerError extends CustomGraphQLError {
    constructor(message: string = 'Internal Server Error') {
        super(message, 'INTERNAL_SERVER_ERROR', 500);
    }
}

export class NotAcceptableError extends CustomGraphQLError {
    constructor(message: string = 'Not Acceptable') {
        super(message, 'NOT_ACCEPTABLE', 406);
    }
}

export class ConflictError extends CustomGraphQLError {
    constructor(message: string = 'Conflict') {
        super(message, 'CONFLICT', 409);
    }
}
