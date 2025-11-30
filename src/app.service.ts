import { Injectable } from '@nestjs/common';
import { GeminiIntegration, IntegrationRegistry } from '@/integrations';

@Injectable()
export class AppService {
    constructor(private registry: IntegrationRegistry) {}

    async getHello() {}
}
