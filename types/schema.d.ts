import { GraphQLSchema } from 'graphql';
export interface BuildSchemaOptions {
    resolvers: Function[];
}
export declare function buildSchema(options: BuildSchemaOptions): GraphQLSchema;
