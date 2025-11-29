import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for REST API exceptions
 */
export class RestException extends HttpException {
    constructor(message: string, statusCode: HttpStatus, error?: string) {
        super(
            {
                statusCode,
                message,
                error: error || HttpException.name,
                timestamp: new Date().toISOString(),
            },
            statusCode,
        );
    }
}

/**
 * 400 Bad Request
 */
export class RestBadRequestException extends RestException {
    constructor(message: string = 'Bad Request') {
        super(message, HttpStatus.BAD_REQUEST, 'Bad Request');
    }
}

/**
 * 401 Unauthorized
 */
export class RestUnauthorizedException extends RestException {
    constructor(message: string = 'Unauthorized') {
        super(message, HttpStatus.UNAUTHORIZED, 'Unauthorized');
    }
}

/**
 * 403 Forbidden
 */
export class RestForbiddenException extends RestException {
    constructor(message: string = 'Forbidden') {
        super(message, HttpStatus.FORBIDDEN, 'Forbidden');
    }
}

/**
 * 404 Not Found
 */
export class RestNotFoundException extends RestException {
    constructor(resource: string, id?: string | number) {
        const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
        super(message, HttpStatus.NOT_FOUND, 'Not Found');
    }
}

/**
 * 409 Conflict
 */
export class RestConflictException extends RestException {
    constructor(message: string = 'Conflict') {
        super(message, HttpStatus.CONFLICT, 'Conflict');
    }
}

/**
 * 422 Unprocessable Entity (for validation errors)
 */
export class RestValidationException extends RestException {
    constructor(errors: Record<string, string[]> | string) {
        const message = typeof errors === 'string' ? errors : 'Validation failed';
        super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'Validation Error');
        if (typeof errors === 'object') {
            this.getResponse()['errors'] = errors;
        }
    }
}

/**
 * 429 Too Many Requests
 */
export class RestTooManyRequestsException extends RestException {
    constructor(message: string = 'Too many requests') {
        super(message, HttpStatus.TOO_MANY_REQUESTS, 'Too Many Requests');
    }
}

/**
 * 500 Internal Server Error
 */
export class RestInternalServerException extends RestException {
    constructor(message: string = 'Internal server error') {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}
