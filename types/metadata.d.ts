import 'reflect-metadata';
import type { GraphQLInputType, GraphQLOutputType } from 'graphql';
import type { AuthHook, GqlOpOptions } from './auth';
export interface GqlExposeOptions {
    output?: boolean;
    input?: boolean;
    nullable?: boolean;
    description?: string;
    type?: () => GraphQLOutputType | GraphQLInputType;
}
export interface GqlTypeOptions {
    description?: string;
}
export interface GqlFieldMetadata extends GqlExposeOptions {
    propertyKey: string;
}
export type GeneratedOpKind = 'list' | 'get' | 'create' | 'update' | 'delete';
export type CustomOpKind = 'query' | 'mutation';
export type OpKind = GeneratedOpKind | CustomOpKind;
export interface OpMetadata {
    kind: OpKind;
    methodKey: string;
    model?: Function;
    returnType?: () => unknown;
    auth?: AuthHook;
    filter?: GqlOpOptions['filter'];
    meta?: GqlOpOptions['meta'];
    description?: string;
}
export interface ArgMetadata {
    methodKey: string;
    parameterIndex: number;
    name?: string;
    type?: () => unknown;
    nullable?: boolean;
    defaultValue?: unknown;
    description?: string;
    isContext?: boolean;
}
export declare function addFieldMetadata(prototype: object, meta: GqlFieldMetadata): void;
export declare function getFieldMetadataForClass(ctor: Function): GqlFieldMetadata[];
export declare function setTypeName(ctor: Function, name: string): void;
export declare function getTypeName(ctor: Function): string;
export declare function setTypeDescription(ctor: Function, description: string | undefined): void;
export declare function getTypeDescription(ctor: Function): string | undefined;
export declare function markResolver(ctor: Function): void;
export declare function isResolverClass(ctor: Function): boolean;
export declare function addOpMetadata(ctor: Function, meta: OpMetadata): void;
export declare function getOpMetadata(ctor: Function): OpMetadata[];
export declare function addArgMetadata(ctor: Function, meta: ArgMetadata): void;
export declare function getArgMetadata(ctor: Function, methodKey: string): ArgMetadata[];
export type { GraphQLInputType, GraphQLOutputType };
