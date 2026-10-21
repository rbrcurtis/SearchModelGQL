# Authorization and tenancy scope for search-model-gql

Status: agreed (2026-10-21). Implement before consumer migration.

## Principles

- **Open by default in the library.** Neither `auth` nor `scope` is required. An
  operation with no `auth` hook is allowed; a schema built with no `scope`
  function is global. Consumers (Accordyx, Okkanti) enforce presence with their
  own lint rules, so the requirement lives where the policy lives.
- **When defined, fail closed.** An `auth` hook allows only on `true`. A `scope`
  function denies on an empty/blank result, a throw, or anything that is not
  `null` (explicit unscoped) or a non-empty list of terms.
- **One primitive.** Both hooks reduce to Elasticsearch terms added to the
  query, so list/get/update/delete/create all run through the same path instead
  of re-implementing record comparison.

## API

```ts
buildSchema({
  resolvers,
  scope: async ({ context, model }) => ['eventId:(a OR b)'],
})
```

```ts
@GqlList(Presentation, { auth: canReadPresentations })
@GqlGet(Presentation, { auth: canReadPresentations })
@GqlUpdate(Presentation, { auth: anyOf(isEventOwner, isEventAdmin) })
```

```ts
export interface AuthInfo<TRecord = unknown, TContext = unknown> {
  context: TContext
  operation: OpKind
  model?: Function
  args: Record<string, unknown>
  input?: Record<string, unknown>
  /** Loaded record for get/update/delete. */
  record?: TRecord
}

export type AuthHook<T = unknown, C = unknown> = (
  info: AuthInfo<T, C>
) => boolean | Promise<boolean>

export type ScopeFunction<C = unknown> = (info: {
  context: C
  model: Function
}) => string[] | null | Promise<string[] | null>

export interface GqlOpOptions<T = unknown, C = unknown> {
  auth?: AuthHook<T, C>
  /** `@GqlList` only: extra terms narrowing the result set. */
  filter?: (info: AuthInfo<T, C>) => string[]
}
```

`scope` returning `null` is the explicit unscoped case. `[]`, `['']`, `undefined`
and throws all deny with `FORBIDDEN` — an empty scope is a bug, not a bypass.

## Execution

Terms are Elasticsearch `query_string` clauses ANDed together by search-model.

| Op | Behaviour |
|---|---|
| list | `terms = [...scope, ...(search ? [search] : []), ...filter]` → `findWithTotal` |
| get | scoped: `findWithTotal([`id:"<id>"`, ...scope])`, no hit → `null`; unscoped: `getById` |
| update | scoped load, no hit → `FORBIDDEN` `{Type} not found`; unscoped: `getById` |
| delete | scoped load, no hit → `false`; unscoped: `getById` |
| create | `create`, then re-read with `[`id:"<newId>"`, ...scope]`; not visible → delete the new row (best effort) and `FORBIDDEN` |
| custom query/mutation | no scope (the method owns its query); `auth` runs first |

`auth` runs after the scoped load (so `info.record` is the record the caller is
allowed to see) and always before any write. Order: scope → load → auth →
filter → operate.

A hook may throw its own `GraphQLError`; the library re-throws it untouched.
Default denial is `FORBIDDEN`. Export `forbidden(message?)` and
`unauthenticated(message?)` so consumers get consistent `extensions.code`.

Combinators: `anyOf(...)`, `allOf(...)`, `not(hook)`.

## Why create needs a read-back

Terms cannot be applied to a document that does not exist yet, so a create with
no tenant stamp would write an invisible row that every read elsewhere filters
out. The read-back makes the scope self-enforcing: a caller may only create rows
they could immediately read, and a misconfigured caller gets `FORBIDDEN` plus no
orphan data. Cost: one query per create.

## Work

1. `src/auth.ts`: `AuthInfo`, `AuthHook`, `ScopeFunction`, `GqlOpOptions`,
   `forbidden`, `unauthenticated`, `anyOf`, `allOf`, `not`.
2. `src/decorators/resolvers.ts`: options object on all seven decorators.
3. `src/metadata.ts`: `auth`/`filter` on `OpMetadata`.
4. `src/schema.ts`: scope resolution, scoped loads, create read-back, `auth`,
   `filter`.
5. `src/index.ts`: export the new surface.
6. `src/__tests__/auth.test.ts`: allow/deny/async/thrown error, record
   visibility, scope terms in every op, unscoped `null`, empty scope denial,
   create read-back rollback, filter merging, combinators.
7. README "Authorization and scope" section.
8. Version 0.1.0 → 0.2.0; rebuild and commit `lib/`, `esm/`, `types/`.

## Follow-up (Accordyx, separate change)

Move `src/lib/graphql/policy.ts` rules onto decorators, delete the yoga
`onExecute` plugin, add the scope function (event roles → `eventId:(...)`,
`ALL` for cross-event admins), add a lint rule requiring `auth`/scope on every
resolver op. This also closes the current over-permissive list reads.
