// src/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { GraphQLError, GraphQLFormattedError } from 'graphql';

@Module({
    imports: [
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                autoSchemaFile: join(process.cwd(), 'schema.gql'),
                sortSchema: true,
                playground: false,
                plugins: [ApolloServerPluginLandingPageLocalDefault()],
                context: ({ req, res }) => ({ req, res }),
                formatError: (error: GraphQLError) => {
                    const graphQLFormattedError: GraphQLFormattedError = {
                        message: error.message,
                        extensions: {
                            code: error.extensions?.code,
                            ...(configService.get('NODE_ENV') === 'development' && {
                                stacktrace: error.extensions?.stacktrace,
                            }),
                        },
                    };
                    return graphQLFormattedError;
                },
                buildSchemaOptions: {
                    numberScalarMode: 'integer',
                },
                installSubscriptionHandlers: true,
                subscriptions: {
                    'graphql-ws': true,
                    'subscriptions-transport-ws': true,
                },
            }),
        }),
    ],
    exports: [GraphQLModule],
})
export class GraphqlConfigModule {}
