// src/config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';
import { EnvService } from './config.service';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
            cache: true,
            expandVariables: true,
        }),
    ],
    providers: [EnvService],
    exports: [ConfigModule, EnvService],
})
export class AppConfigModule {}
