import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { graphql } from 'graphql'
import type { GraphQLSchema } from 'graphql'
import { KeywordType, SearchModel, StringType } from 'search-model'
import {
  GqlCreate,
  GqlDelete,
  GqlExpose,
  GqlGet,
  GqlList,
  GqlMutation,
  GqlQuery,
  GqlType,
  GqlUpdate,
  Resolver,
  allOf,
  anyOf,
  buildSchema,
  forbidden,
  not,
  unauthenticated,
} from '../index'
import type { AuthHook, AuthInfo, CreateMutation, DeleteMutation, GetQuery, ListQuery, ScopeFunction, UpdateMutation } from '../index'

@GqlType('Doc')
class Doc extends SearchModel<Doc> {
  static readonly indexName = 'test_docs'

  @KeywordType({ required: true })
  @GqlExpose({ input: true })
  tenantId!: string

  @StringType({ required: true })
  @GqlExpose({ input: true })
  title!: string
}

interface StoredDoc extends Doc {
  id: string
}

let docs: Map<string, StoredDoc>
let nextId: number

/** Minimal `query_string` interpreter for the term shapes the library emits. */
function matches(doc: StoredDoc, term: string): boolean {
  const group = term.match(/^(\w+):\((.*)\)$/)
  if (group) {
    return group[2]
      .split(/\s+OR\s+/, -1)
      .map((part) => part.trim().replace(/^"|"$/g, ''))
      .some((value) => String((doc as unknown as Record<string, unknown>)[group[1]]) === value)
  }
  const single = term.match(/^(\w+):(.*)$/)
  if (!single) throw new Error(`unsupported test term: ${term}`)
  const value = single[2].trim().replace(/^"|"$/g, '')
  return String((doc as unknown as Record<string, unknown>)[single[1]]) === value
}

function stubModel(): void {
  docs = new Map()
  nextId = 0

  const statics = Doc as unknown as Record<string, unknown>
  statics.getById = async (id: string) => docs.get(id) ?? null
  statics.findWithTotal = async (terms: string[], options?: { limit?: number }) => {
    let hits = [...docs.values()]
    for (const term of terms) hits = hits.filter((doc) => matches(doc, term))
    hits.sort((a, b) => (a.id < b.id ? -1 : 1))
    return { hits: options?.limit ? hits.slice(0, options.limit) : hits, total: hits.length }
  }
  statics.create = async (input: Record<string, unknown>) => {
    nextId += 1
    const doc = new Doc(input as Partial<Doc>) as StoredDoc
    doc.id = `doc${nextId}`
    doc.update = (data: Record<string, unknown>) => {
      Object.assign(doc, data)
      return doc
    }
    doc.save = async () => doc
    doc.delete = async () => {
      docs.delete(doc.id)
    }
    docs.set(doc.id, doc)
    return doc
  }
}

function seed(): void {
  for (const [id, tenantId, title] of [
    ['a1', 'tenantA', 'Alpha'],
    ['a2', 'tenantA', 'Beta'],
    ['b1', 'tenantB', 'Gamma'],
  ] as const) {
    const doc = new Doc({ tenantId, title }) as StoredDoc
    doc.id = id
    doc.update = (data) => {
      Object.assign(doc, data)
      return doc
    }
    doc.save = async () => doc
    doc.delete = async () => {
      docs.delete(doc.id)
    }
    docs.set(id, doc)
  }
  nextId = 100
}

const tenantA: ScopeFunction = () => ['tenantId:tenantA']

async function run(
  schema: GraphQLSchema,
  source: string,
  context: unknown = {},
  variableValues?: Record<string, unknown>
) {
  return graphql({ schema, source, contextValue: context, variableValues })
}

function codes(result: { errors?: ReadonlyArray<{ extensions?: unknown }> }): string[] {
  return (result.errors ?? []).map(
    (error) => ((error.extensions as { code?: string } | undefined)?.code ?? 'none') as string
  )
}

beforeEach(() => {
  stubModel()
  seed()
})

describe('open by default', () => {
  @Resolver()
  class OpenResolver {
    @GqlList(Doc)
    declare docs: ListQuery<Doc>

    @GqlGet(Doc)
    declare doc: GetQuery<Doc>
  }

  it('serves every row when no auth or scope is configured', async () => {
    const schema = buildSchema({ resolvers: [OpenResolver] })
    const result = await run(schema, '{ docs { total hits { id } } doc(id: "b1") { id } }')
    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      docs: { total: 3, hits: [{ id: 'a1' }, { id: 'a2' }, { id: 'b1' }] },
      doc: { id: 'b1' },
    })
  })
})

describe('auth hooks', () => {
  it('allows only on a true return, denies on false and on a missing return', async () => {
    const yes: AuthHook = () => true
    const no: AuthHook = () => false
    const empty: AuthHook = () => undefined as unknown as boolean

    @Resolver()
    class YesResolver {
      @GqlList(Doc, { auth: yes })
      declare docs: ListQuery<Doc>
    }
    @Resolver()
    class NoResolver {
      @GqlList(Doc, { auth: no })
      declare docs: ListQuery<Doc>
    }
    @Resolver()
    class EmptyResolver {
      @GqlList(Doc, { auth: empty })
      declare docs: ListQuery<Doc>
    }

    expect((await run(buildSchema({ resolvers: [YesResolver] }), '{ docs { total } }')).data).toEqual({
      docs: { total: 3 },
    })
    const denied = await run(buildSchema({ resolvers: [NoResolver] }), '{ docs { total } }')
    // `docs` is non-null, so a denial nulls the whole response.
    expect(denied.data).toBeNull()
    expect(codes(denied)).toEqual(['FORBIDDEN'])
    expect(codes(await run(buildSchema({ resolvers: [EmptyResolver] }), '{ docs { total } }'))).toEqual([
      'FORBIDDEN',
    ])
  })

  it('awaits async hooks and lets a hook throw its own GraphQLError', async () => {
    const slow: AuthHook = async () => {
      await Promise.resolve()
      return false
    }
    const unauth: AuthHook = () => {
      throw unauthenticated('no session')
    }

    @Resolver()
    class SlowResolver {
      @GqlGet(Doc, { auth: slow })
      declare doc: GetQuery<Doc>
    }
    @Resolver()
    class UnauthResolver {
      @GqlGet(Doc, { auth: unauth })
      declare doc: GetQuery<Doc>
    }

    expect(codes(await run(buildSchema({ resolvers: [SlowResolver] }), '{ doc(id: "a1") { id } }'))).toEqual([
      'FORBIDDEN',
    ])
    const result = await run(buildSchema({ resolvers: [UnauthResolver] }), '{ doc(id: "a1") { id } }')
    expect(codes(result)).toEqual(['UNAUTHORIZED'])
    expect(result.errors?.[0].message).toBe('no session')
  })

  it('passes the loaded record and the operation to the hook', async () => {
    const seen: AuthInfo[] = []
    const record = (info: AuthInfo) => {
      seen.push(info)
      return true
    }

    @Resolver()
    class RecordResolver {
      @GqlGet(Doc, { auth: record })
      declare doc: GetQuery<Doc>

      @GqlUpdate(Doc, { auth: record })
      declare updateDoc: UpdateMutation<Doc>

      @GqlDelete(Doc, { auth: record })
      declare deleteDoc: DeleteMutation<Doc>
    }

    const schema = buildSchema({ resolvers: [RecordResolver] })
    await run(schema, '{ doc(id: "a1") { id } }', { user: 'u1' })
    await run(schema, 'mutation { updateDoc(id: "a2", input: { title: "Changed" }) { id } }', {
      user: 'u1',
    })
    await run(schema, 'mutation { deleteDoc(id: "a2") }', { user: 'u1' })

    expect(seen.map((info) => info.operation)).toEqual(['get', 'update', 'delete'])
    expect(seen.map((info) => (info.record as StoredDoc).id)).toEqual(['a1', 'a2', 'a2'])
    expect(seen[0].context).toEqual({ user: 'u1' })
    expect(docs.has('a2')).toBe(false)
  })

  it('checks auth before writing', async () => {
    const deny: AuthHook = () => false

    @Resolver()
    class DenyResolver {
      @GqlList(Doc)
      declare docs: ListQuery<Doc>

      @GqlCreate(Doc, { auth: deny })
      declare createDoc: CreateMutation<Doc>

      @GqlUpdate(Doc, { auth: deny })
      declare updateDoc: UpdateMutation<Doc>

      @GqlDelete(Doc, { auth: deny })
      declare deleteDoc: DeleteMutation<Doc>
    }

    const schema = buildSchema({ resolvers: [DenyResolver] })
    const created = await run(
      schema,
      'mutation { createDoc(input: { tenantId: "tenantA", title: "New" }) { id } }'
    )
    expect(codes(created)).toEqual(['FORBIDDEN'])
    expect(docs.size).toBe(3)

    await run(schema, 'mutation { updateDoc(id: "a1", input: { title: "Nope" }) { id } }')
    expect(docs.get('a1')?.title).toBe('Alpha')

    await run(schema, 'mutation { deleteDoc(id: "a1") }')
    expect(docs.has('a1')).toBe(true)
  })

  it('guards custom operations and passes the context through', async () => {
    const contextOnly: AuthHook = (info) =>
      (info.context as { user?: string } | undefined)?.user === 'u1'

    @Resolver()
    class CustomResolver {
      @GqlQuery(() => Boolean, { auth: contextOnly })
      ping(): boolean {
        return true
      }

      @GqlMutation(() => String, { auth: () => false })
      never(): string {
        return 'no'
      }
    }

    const schema = buildSchema({ resolvers: [CustomResolver] })
    expect((await run(schema, '{ ping }', { user: 'u1' })).data).toEqual({ ping: true })
    expect(codes(await run(schema, '{ ping }', {}))).toEqual(['FORBIDDEN'])
    expect(codes(await run(schema, 'mutation { never }', { user: 'u1' }))).toEqual(['FORBIDDEN'])
  })

  it('composes hooks with anyOf, allOf and not', async () => {
    const isUser: AuthHook = (info) => !!(info.context as { user?: string }).user
    const isAdmin: AuthHook = (info) => (info.context as { admin?: boolean }).admin === true

    @Resolver()
    class ComposedResolver {
      @GqlList(Doc, { auth: anyOf(isUser, isAdmin) })
      declare docs: ListQuery<Doc>

      @GqlGet(Doc, { auth: allOf(isUser, not(isAdmin)) })
      declare doc: GetQuery<Doc>
    }

    const schema = buildSchema({ resolvers: [ComposedResolver] })
    expect((await run(schema, '{ docs { total } }', { admin: true })).data).toEqual({
      docs: { total: 3 },
    })
    expect(codes(await run(schema, '{ docs { total } }', {}))).toEqual(['FORBIDDEN'])
    expect((await run(schema, '{ doc(id: "a1") { id } }', { user: 'u1' })).data).toEqual({
      doc: { id: 'a1' },
    })
    expect(codes(await run(schema, '{ doc(id: "a1") { id } }', { user: 'u1', admin: true }))).toEqual([
      'FORBIDDEN',
    ])
  })
})

describe('tenancy scope', () => {
  it('restricts lists to the scope terms and keeps the search term ANDed', async () => {
    @Resolver()
    class ScopedResolver {
      @GqlList(Doc)
      declare docs: ListQuery<Doc>
    }

    const schema = buildSchema({ resolvers: [ScopedResolver], scope: tenantA })
    const list = await run(schema, '{ docs { total hits { id } } }')
    expect(list.data).toEqual({ docs: { total: 2, hits: [{ id: 'a1' }, { id: 'a2' }] } })

    const filtered = await run(schema, '{ docs(search: "title:Beta") { total hits { id } } }')
    expect(filtered.data).toEqual({ docs: { total: 1, hits: [{ id: 'a2' }] } })
  })

  it('makes out-of-scope rows invisible to get, update and delete', async () => {
    @Resolver()
    class ScopedResolver {
      @GqlGet(Doc)
      declare doc: GetQuery<Doc>

      @GqlUpdate(Doc)
      declare updateDoc: UpdateMutation<Doc>

      @GqlDelete(Doc)
      declare deleteDoc: DeleteMutation<Doc>
    }

    const schema = buildSchema({ resolvers: [ScopedResolver], scope: tenantA })
    expect((await run(schema, '{ doc(id: "b1") { id } }')).data).toEqual({ doc: null })
    expect((await run(schema, '{ doc(id: "a1") { id } }')).data).toEqual({ doc: { id: 'a1' } })

    const update = await run(schema, 'mutation { updateDoc(id: "b1", input: { title: "Hijack" }) { id } }')
    expect(codes(update)).toEqual(['none'])
    expect(update.errors?.[0].message).toMatch(/not found/)
    expect(docs.get('b1')?.title).toBe('Gamma')

    const removed = await run(schema, 'mutation { deleteDoc(id: "b1") }')
    expect(removed.data).toEqual({ deleteDoc: false })
    expect(docs.has('b1')).toBe(true)
  })

  it('rolls back a create that falls outside the scope', async () => {
    @Resolver()
    class ScopedResolver {
      @GqlList(Doc)
      declare docs: ListQuery<Doc>

      @GqlCreate(Doc)
      declare createDoc: CreateMutation<Doc>
    }

    const schema = buildSchema({ resolvers: [ScopedResolver], scope: tenantA })

    const inside = await run(
      schema,
      'mutation { createDoc(input: { tenantId: "tenantA", title: "Fresh" }) { id tenantId } }'
    )
    expect(inside.errors).toBeUndefined()
    expect(docs.size).toBe(4)

    const outside = await run(
      schema,
      'mutation { createDoc(input: { tenantId: "tenantB", title: "Escape" }) { id } }'
    )
    expect(codes(outside)).toEqual(['FORBIDDEN'])
    expect(docs.size).toBe(4)
    expect([...docs.values()].some((doc) => doc.title === 'Escape')).toBe(false)
  })

  it('denies when the scope resolves to nothing and stays open on null', async () => {
    @Resolver()
    class ScopedResolver {
      @GqlList(Doc)
      declare docs: ListQuery<Doc>
    }

    const empty = buildSchema({ resolvers: [ScopedResolver], scope: () => [] })
    expect(codes(await run(empty, '{ docs { total } }'))).toEqual(['FORBIDDEN'])

    const blank = buildSchema({ resolvers: [ScopedResolver], scope: () => ['  '] })
    expect(codes(await run(blank, '{ docs { total } }'))).toEqual(['FORBIDDEN'])

    const throwing = buildSchema({
      resolvers: [ScopedResolver],
      scope: () => {
        throw new Error('no tenant')
      },
    })
    expect(codes(await run(throwing, '{ docs { total } }'))).toEqual(['none'])

    const unscoped = buildSchema({ resolvers: [ScopedResolver], scope: () => null })
    expect((await run(unscoped, '{ docs { total } }')).data).toEqual({ docs: { total: 3 } })
  })

  it('merges filter terms into list queries only', async () => {
    const filter = vi.fn(() => ['title:Alpha'])

    @Resolver()
    class FilteredResolver {
      @GqlList(Doc, { filter })
      declare docs: ListQuery<Doc>
    }

    const schema = buildSchema({ resolvers: [FilteredResolver], scope: tenantA })
    const result = await run(schema, '{ docs { total hits { id } } }')
    expect(result.data).toEqual({ docs: { total: 1, hits: [{ id: 'a1' }] } })
    expect(filter).toHaveBeenCalledTimes(1)
  })

  it('combines scope with auth in the documented order', async () => {
    const order: string[] = []
    const scope: ScopeFunction = () => {
      order.push('scope')
      return ['tenantId:tenantA']
    }
    const auth: AuthHook = (info) => {
      order.push(`auth:${(info.record as StoredDoc | undefined)?.id ?? 'none'}`)
      return true
    }

    @Resolver()
    class BothResolver {
      @GqlGet(Doc, { auth })
      declare doc: GetQuery<Doc>
    }

    const schema = buildSchema({ resolvers: [BothResolver], scope })
    expect((await run(schema, '{ doc(id: "b1") { id } }')).data).toEqual({ doc: null })
    expect(order).toEqual(['scope'])

    order.length = 0
    expect((await run(schema, '{ doc(id: "a1") { id } }')).data).toEqual({ doc: { id: 'a1' } })
    expect(order).toEqual(['scope', 'auth:a1'])
  })

  it('forbidden() carries the FORBIDDEN code for consumer-thrown errors', () => {
    expect(forbidden().extensions?.code).toBe('FORBIDDEN')
  })
})
