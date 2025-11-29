import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
    private readonly logger = new Logger(RequestLoggerInterceptor.name);
    private readonly maxLogLength = 2000;

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();
        const response = httpContext.getResponse<Response>();

        if (!request || !response) {
            return next.handle();
        }

        const { method, originalUrl: url } = request;
        const requestBody = this.sanitizeBody(request.body);

        this.logger.log(
            `Incoming Request: ${method} ${url} | body=${this.truncate(JSON.stringify(requestBody))}`,
        );

        const startTime = Date.now();

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode;
                const responseBody = this.truncate(JSON.stringify(data));

                this.logger.log(
                    `Outgoing Response: ${method} ${url} ${statusCode} (${duration}ms) | body=${responseBody}`,
                );
            }),
        );
    }

    private truncate(value: string): string {
        if (!value) return value;
        if (value.length <= this.maxLogLength) return value;
        return value.substring(0, this.maxLogLength) + '...<truncated>'; 
    }

    private sanitizeBody(body: any): any {
        if (!body || typeof body !== 'object') return body;

        const sensitiveKeys = ['password', 'pwd', 'token', 'accessToken', 'refreshToken'];

        const clone: any = Array.isArray(body) ? [...body] : { ...body };

        const maskRecursive = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            Object.keys(obj).forEach((key) => {
                const value = obj[key];

                if (sensitiveKeys.includes(key)) {
                    obj[key] = '[REDACTED]';
                } else if (typeof value === 'object') {
                    maskRecursive(value);
                }
            });
        };

        maskRecursive(clone);
        return clone;
    }
}
