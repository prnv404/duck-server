import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@/modules/user/user.module';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { EnvService } from '@/config/config.service';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            inject: [EnvService],
            useFactory: (config: EnvService) => ({
                secret: config.get('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
            }),
        }),
    ],
    providers: [AuthService, AuthResolver, JwtStrategy, RefreshTokenStrategy],
    exports: [AuthService],
})
export class AuthModule {}
