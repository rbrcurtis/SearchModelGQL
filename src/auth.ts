import { GraphQLError } from 'graphql'
import type { OpKind } from './metadata'

/** What a resolver knows about the operation when a hook runs. */
export interface AuthInfo<TRecord = unknown, TContext = unknown> {
  /** GraphQL context supplied by the transport. */
  context: TContext
  /** Which operation is being authorized. */
  operation: OpKind
  /** Target model for generated operations. */
  model?: Function
  /** Raw GraphQL arguments (id, input, search, pagination, sort, custom args). */
  args: Record<string, unknown>
  /** Convenience alias for `args.input`. */
  input?: Record<string, unknown>
  /** Loaded record for get/update/delete. */
  record?: TRecord
}

/**
 * Authorize one operation. Return `true` to allow; anything else denies.
 *
 * Throwing is also supported and lets the hook choose the error: the library
 * re-throws a `GraphQLError` untouched and treats any other thrown error as a
 * denial.
 */
export type AuthHook<T = unknown, C = unknown> = (
  info: AuthInfo<T, C>
) => boolean | Promise<boolean>

/**
 * Restrict every operation on a model to the given Elasticsearch terms.
 *
 * Return `null` for an explicitly unscoped model (global data). Return a
 * non-empty list of `query_string` terms to AND into every query — for example
 * `['eventId:(a OR b)']`. An empty or blank list is treated as a denial, so a
 * broken scope can never widen access.
 */
export type ScopeFunction<C = unknown> = (info: {
  context: C
  model: Function
}) => string[] | null | Promise<string[] | null>

/** Options accepted by every resolver decorator. */
export interface GqlOpOptions<T = unknown, C = unknown> {
  /** Authorize before the operation runs. Allows only on `true`. */
  auth?: AuthHook<T, C>
  /** `@GqlList` only: extra terms narrowing the result set. */
  filter?: (info: AuthInfo<T, C>) => string[]
}

/** A denial: the caller is authenticated but may not perform the operation. */
export function forbidden(message = 'Not authorized for this operation'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } })
}

/** A denial for callers with no established identity. */
export function unauthenticated(message = 'Authentication required'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'UNAUTHORIZED' } })
}

/** Allow when any hook allows. Denies when every hook denies or any throws. */
export function anyOf<T = unknown, C = unknown>(
  ...hooks: AuthHook<T, C>[]
): AuthHook<T, C> {
  return async (info) => {
    for (const hook of hooks) {
      if ((await hook(info)) === true) return true
    }
    return false
  }
}

/** Allow only when every hook allows. */
export function allOf<T = unknown, C = unknown>(
  ...hooks: AuthHook<T, C>[]
): AuthHook<T, C> {
  return async (info) => {
    for (const hook of hooks) {
      if ((await hook(info)) !== true) return false
    }
    return true
  }
}

/** Invert a hook. A throw still surfaces as a throw. */
export function not<T = unknown, C = unknown>(hook: AuthHook<T, C>): AuthHook<T, C> {
  return async (info) => (await hook(info)) !== true
}

/**
 * Run a hook and turn anything other than an explicit `true` into a denial.
 * A `GraphQLError` thrown by the hook is re-thrown unchanged.
 */
export async function enforceAuth(
  hook: AuthHook,
  info: AuthInfo
): Promise<void> {
  const allowed = await hook(info)
  if (allowed !== true) throw forbidden()
}
