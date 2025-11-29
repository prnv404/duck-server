import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestUnauthorizedException } from '@/common/exceptions';

@Injectable()
export class JwtRestAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw new RestUnauthorizedException(info?.message || 'Invalid or expired token');
        }
        return user;
    }
}
