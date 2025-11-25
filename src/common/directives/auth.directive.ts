import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { UnauthorizedError } from '../exceptions/graphql-exceptions';

export function authDirective(directiveName: string = 'auth') {
    return (schema: GraphQLSchema) => {
        return mapSchema(schema, {
            [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

                if (authDirective) {
                    const { resolve = defaultFieldResolver } = fieldConfig;

                    fieldConfig.resolve = async (source, args, context, info) => {
                        if (!context.req.user) {
                            throw new UnauthorizedError('Authentication required');
                        }
                        return resolve(source, args, context, info);
                    };
                }

                return fieldConfig;
            },
        });
    };
}
