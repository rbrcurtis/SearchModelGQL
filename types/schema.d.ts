import { GraphQLSchema } from 'graphql';
import type { ScopeFunction } from './auth';
export interface BuildSchemaOptions {
    resolvers: Function[];
    scope?: ScopeFunction;
}
export declare function buildSchema(options: BuildSchemaOptions): GraphQLSchema;
