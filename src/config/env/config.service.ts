// src/config/typed-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.schema';

@Injectable()
export class EnvService {
    constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

    get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
        return this.configService.get<K>(key, { infer: true }) as unknown as EnvConfig[K];
    }
}
