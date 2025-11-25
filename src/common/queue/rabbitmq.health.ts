import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RabbitMQService } from './rabbitmq.service';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
    constructor(private readonly rabbitMQService: RabbitMQService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        const isConnected = this.rabbitMQService.isConnected();
        const result = this.getStatus(key, isConnected);

        if (isConnected) {
            return result;
        }

        throw new HealthCheckError('RabbitMQ check failed', result);
    }
}
