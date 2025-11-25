import { Catch, ArgumentsHost, HttpException, BadRequestException, Logger, HttpStatus } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
    private readonly logger = new Logger(GraphqlExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const gqlHost = GqlArgumentsHost.create(host);
        const info = gqlHost.getInfo();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_SERVER_ERROR';
        let extensions: Record<string, any> = {};

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();
            message = typeof response === 'string' ? response : (response as any).message || exception.message;
            code = this.getErrorCode(status);

            if (exception instanceof BadRequestException) {
                const responseObj = exception.getResponse() as any;
                if (Array.isArray(responseObj.message)) {
                    extensions.validationErrors = responseObj.message;
                    message = 'Validation failed';
                }
            }
        } else if (exception instanceof GraphQLError) {
            return exception;
        } else {
            // Log unknown errors
            this.logger.error(`Unexpected error: ${exception}`, (exception as Error).stack);
        }

        return new GraphQLError(message, {
            extensions: {
                ...extensions,
                code,
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: info?.path,
            },
        });
    }

    private getErrorCode(status: number): string {
        const codes: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            500: 'INTERNAL_SERVER_ERROR',
            406: 'NOT_ACCEPTABLE',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
        };
        return codes[status] || 'UNKNOWN_ERROR';
    }
}
