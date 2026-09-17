import { GraphQLEnumType } from 'graphql';
import type { GqlExposeOptions } from '../metadata';
export declare function GqlExpose(options?: GqlExposeOptions): (target: object, propertyKey: string) => void;
export declare function GqlType(name: string): (target: Function) => void;
export declare function gqlEnum(name: string, values: readonly string[]): GraphQLEnumType;
