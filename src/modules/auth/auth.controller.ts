import { Controller, All, Req, Res } from '@nestjs/common';
import { auth } from '@/config/auth/auth';
import { toNodeHandler } from 'better-auth/node';

@Controller('auth')
export class AuthController {
    @All('*')
    async auth(@Req() req: any, @Res() res: any) {
        return toNodeHandler(auth)(req, res);
    }
}
