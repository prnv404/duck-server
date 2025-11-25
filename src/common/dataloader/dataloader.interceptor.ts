import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { DataLoaderService } from './dataloader.service';

@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = GqlExecutionContext.create(context);
        const request = ctx.getContext().req;

        if (!request.dataLoaderService) {
            request.dataLoaderService = new DataLoaderService();
        }

        return next.handle();
    }
}
