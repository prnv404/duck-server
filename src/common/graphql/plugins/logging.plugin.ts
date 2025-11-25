import { Plugin } from '@nestjs/apollo';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const startTime = Date.now();
        let operation: string;

        return {
            async didResolveOperation({ request }) {
                operation = request.operationName || 'Anonymous';
            },
            async willSendResponse() {
                const duration = Date.now() - startTime;
                console.log(`${operation} took ${duration}ms`);
            },
        };
    }
}
