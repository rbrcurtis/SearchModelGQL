import type { GraphQLInputType, GraphQLOutputType } from 'graphql';
import type { SearchFieldMetadata } from './searchModel';
export declare function leafOutputType(type: SearchFieldMetadata['type']): GraphQLOutputType | undefined;
export declare function leafInputType(type: SearchFieldMetadata['type']): GraphQLInputType | undefined;
