import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import type { SearchModelClass } from '../searchModel';
export interface ModelTypeSet {
    model: SearchModelClass;
    typeName: string;
    output: GraphQLObjectType;
    createInput: GraphQLInputObjectType;
    updateInput: GraphQLInputObjectType;
    listResult: GraphQLObjectType;
}
export declare function buildModelTypes(model: SearchModelClass): ModelTypeSet;
