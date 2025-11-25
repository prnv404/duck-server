// src/rabbitmq/rabbitmq.module.ts
import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQHealthIndicator } from './rabbitmq.health';
import rabbitmqConfig from './rabbitmq.config';

@Global()
@Module({
    imports: [ConfigModule.forFeature(rabbitmqConfig)],
    providers: [RabbitMQService, RabbitMQHealthIndicator],
    exports: [RabbitMQService, RabbitMQHealthIndicator],
})
export class RabbitMQModule implements OnModuleInit {
    constructor(private readonly rabbitMQService: RabbitMQService) {}

    async onModuleInit() {
        await this.rabbitMQService.connect();

        // this.rabbitMQService.consume('event.queue', async (msg) => {

        //     for (const event of msg.events) {
        //         fetch(event.connection.destination.url, {
        //             method: 'POST',
        //             headers: {
        //                 'Content-Type': 'application/json',
        //             },
        //             body: JSON.stringify(msg.body),
        //         })
        //     }
        // });
    }
}
