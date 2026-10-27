import { GraphQLError } from 'graphql';
import type { OpKind } from './metadata';
export interface AuthInfo<TRecord = unknown, TContext = unknown> {
    context: TContext;
    operation: OpKind;
    model?: Function;
    args: Record<string, unknown>;
    input?: Record<string, unknown>;
    record?: TRecord;
}
export type AuthHook<T = unknown, C = unknown> = (info: AuthInfo<T, C>) => boolean | Promise<boolean>;
export type ScopeFunction<C = unknown> = (info: {
    context: C;
    model: Function;
}) => string[] | null | Promise<string[] | null>;
export interface GqlOpOptions<T = unknown, C = unknown> {
    auth?: AuthHook<T, C>;
    filter?: (info: AuthInfo<T, C>) => string[];
    description?: string;
    meta?: (info: AuthInfo<T, C>) => Record<string, unknown>;
}
export declare function forbidden(message?: string): GraphQLError;
export declare function unauthenticated(message?: string): GraphQLError;
export declare function anyOf<T = unknown, C = unknown>(...hooks: AuthHook<T, C>[]): AuthHook<T, C>;
export declare function allOf<T = unknown, C = unknown>(...hooks: AuthHook<T, C>[]): AuthHook<T, C>;
export declare function not<T = unknown, C = unknown>(hook: AuthHook<T, C>): AuthHook<T, C>;
export declare function enforceAuth(hook: AuthHook, info: AuthInfo): Promise<void>;
