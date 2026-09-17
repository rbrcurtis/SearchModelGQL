import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import type { SearchFieldMetadata } from '../searchModel';
type NestedProperties = Record<string, SearchFieldMetadata>;
export declare function buildNestedOutputType(name: string, properties: NestedProperties): GraphQLObjectType;
export declare function buildNestedInputType(name: string, properties: NestedProperties): GraphQLInputObjectType;
export {};
