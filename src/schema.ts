import {
  GraphQLError,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  isInputType,
  isOutputType,
} from 'graphql'
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLScalarType,
} from 'graphql'
import { buildModelTypes } from './builders/modelTypes'
import type { ModelTypeSet } from './builders/modelTypes'
import { getArgMetadata, getOpMetadata, isResolverClass } from './metadata'
import type { OpMetadata } from './metadata'
import { GraphQLDateTime } from './scalars'
import {
  createMutationName,
  deleteMutationName,
  listFieldName,
  singleFieldName,
  updateMutationName,
} from './naming'
import type { SearchModelClass } from './searchModel'
import { PaginationInput, SortInput } from './shared'

/** Options for {@link buildSchema}. */
export interface BuildSchemaOptions {
  /** Resolver classes decorated with `@Resolver()`. */
  resolvers: Function[]
}

type ModelRegistry = Map<Function, ModelTypeSet>
type EnsureModel = (model: Function) => ModelTypeSet

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function buildListField(set: ModelTypeSet): GraphQLFieldConfig<unknown, unknown> {
  return {
    type: new GraphQLNonNull(set.listResult),
    description: `List ${set.typeName} records. Filter with the search string using Elasticsearch query syntax.`,
    args: {
      search: { type: GraphQLString, description: 'Elasticsearch query string.' },
      pagination: { type: PaginationInput, description: 'Page-based pagination.' },
      sort: { type: SortInput, description: 'Sort order.' },
    },
    resolve: async (_source, rawArgs) => {
      const args = asRecord(rawArgs)
      const pagination = asRecord(args.pagination)
      const page = Math.max(1, asNumber(pagination.page, 1))
      const limit = Math.min(asNumber(pagination.limit, 1000), 1000)
      const search = asString(args.search)
      const terms = search ? [search] : []
      const sort = asRecord(args.sort)
      const sortField = asString(sort.field)
      const sortString = sortField
        ? `${sortField}:${sort.direction === 'ASC' ? 'asc' : 'desc'}`
        : undefined
      const { hits, total } = await set.model.findWithTotal(terms, {
        page,
        limit,
        sort: sortString,
      })
      return { hits, total, page }
    },
  }
}

function buildGetField(set: ModelTypeSet): GraphQLFieldConfig<unknown, unknown> {
  return {
    type: set.output,
    description: `Fetch one ${set.typeName} by id. Returns null when not found.`,
    args: { id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' } },
    resolve: async (_source, rawArgs) => {
      const id = asString(asRecord(rawArgs).id)
      if (!id) return null
      return set.model.getById(id)
    },
  }
}

function buildCreateField(set: ModelTypeSet): GraphQLFieldConfig<unknown, unknown> {
  return {
    type: new GraphQLNonNull(set.output),
    description: `Create one ${set.typeName}. Required fields are enforced.`,
    args: {
      input: { type: new GraphQLNonNull(set.createInput), description: `New ${set.typeName}.` },
    },
    resolve: async (_source, rawArgs) => {
      const input = asRecord(asRecord(rawArgs).input)
      return set.model.create(input, { wait: true })
    },
  }
}

function buildUpdateField(set: ModelTypeSet): GraphQLFieldConfig<unknown, unknown> {
  return {
    type: new GraphQLNonNull(set.output),
    description: `Update one ${set.typeName} by id. All input fields are optional.`,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' },
      input: { type: new GraphQLNonNull(set.updateInput), description: 'Fields to change.' },
    },
    resolve: async (_source, rawArgs) => {
      const args = asRecord(rawArgs)
      const id = asString(args.id)
      if (!id) throw new GraphQLError(`${set.typeName} id is required`)
      const item = await set.model.getById(id)
      if (!item) throw new GraphQLError(`${set.typeName} ${id} not found`)
      item.update(asRecord(args.input))
      await item.save({ wait: true })
      return item
    },
  }
}

function buildDeleteField(set: ModelTypeSet): GraphQLFieldConfig<unknown, unknown> {
  return {
    type: new GraphQLNonNull(GraphQLBoolean),
    description: `Delete one ${set.typeName} by id. Returns false when not found.`,
    args: { id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' } },
    resolve: async (_source, rawArgs) => {
      const id = asString(asRecord(rawArgs).id)
      if (!id) return false
      const item = await set.model.getById(id)
      if (!item) return false
      await item.delete()
      return true
    },
  }
}

/** Map JS primitive constructors to their GraphQL scalar equivalents. */
function primitiveScalar(value: unknown): GraphQLScalarType | undefined {
  if (value === String) return GraphQLString
  if (value === Boolean) return GraphQLBoolean
  if (value === Number) return GraphQLFloat
  if (value === Date) return GraphQLDateTime
  return undefined
}

/** A search-model class carries a static `indexName`. */
function isSearchModelClass(value: unknown): value is Function {
  return (
    typeof value === 'function' &&
    typeof (value as { indexName?: unknown }).indexName === 'string'
  )
}

function resolveOutputType(value: unknown, ensure: EnsureModel): GraphQLOutputType {
  const primitive = primitiveScalar(value)
  if (primitive) return primitive
  if (isSearchModelClass(value)) return ensure(value).output
  if (value && isOutputType(value)) return value
  throw new Error(
    'Custom resolver return type must be a GraphQL output type, a JS primitive, or a search-model class'
  )
}

function resolveInputType(value: unknown, ensure: EnsureModel): GraphQLInputType {
  const primitive = primitiveScalar(value)
  if (primitive) return primitive
  if (isSearchModelClass(value)) return ensure(value).createInput
  if (value && isInputType(value)) return value
  throw new Error(
    'Custom resolver argument type must be a GraphQL input type, a JS primitive, or a search-model class'
  )
}

function buildCustomField(
  resolver: Function,
  instance: unknown,
  op: OpMetadata,
  ensure: EnsureModel
): GraphQLFieldConfig<unknown, unknown> {
  const argMetadata = getArgMetadata(resolver, op.methodKey)
  const args: GraphQLFieldConfigArgumentMap = {}
  for (const meta of argMetadata) {
    if (meta.isContext || !meta.name || !meta.type) continue
    const type = resolveInputType(meta.type(), ensure)
    args[meta.name] = {
      type: meta.nullable ? type : new GraphQLNonNull(type),
      defaultValue: meta.defaultValue,
      description: meta.description,
    }
  }

  return {
    type: resolveOutputType(op.returnType ? op.returnType() : undefined, ensure),
    args,
    resolve: (_source, rawArgs, context) => {
      const gqlArgs = asRecord(rawArgs)
      const positional: unknown[] = []
      for (const meta of argMetadata) {
        positional[meta.parameterIndex] = meta.isContext ? context : gqlArgs[meta.name ?? '']
      }
      const fn = (instance as Record<string, unknown>)[op.methodKey]
      if (typeof fn !== 'function') {
        throw new GraphQLError(`${resolver.name}.${op.methodKey} is not a method`)
      }
      return (fn as (...params: unknown[]) => unknown).apply(instance, positional)
    },
  }
}

/**
 * Build a graphql-js schema from resolver classes decorated with `@Resolver()`.
 *
 * Generated operations come from `@GqlList`, `@GqlGet`, `@GqlCreate`,
 * `@GqlUpdate`, and `@GqlDelete`. Custom operations come from `@GqlQuery` and
 * `@GqlMutation` methods. Model types are generated from the `@GqlExpose`
 * decorators on each model and its search-model field metadata.
 */
export function buildSchema(options: BuildSchemaOptions): GraphQLSchema {
  const registry: ModelRegistry = new Map()
  const ensure: EnsureModel = (model) => {
    const existing = registry.get(model)
    if (existing) return existing
    if (typeof model !== 'function' || typeof model.prototype === 'undefined') {
      throw new Error('Expected a search-model model class')
    }
    const built = buildModelTypes(model as unknown as SearchModelClass)
    registry.set(model, built)
    return built
  }

  for (const resolver of options.resolvers) {
    for (const op of getOpMetadata(resolver)) {
      if (op.model) ensure(op.model)
    }
  }

  const queryFields: GraphQLFieldConfigMap<unknown, unknown> = {}
  const mutationFields: GraphQLFieldConfigMap<unknown, unknown> = {}

  for (const resolver of options.resolvers) {
    if (!isResolverClass(resolver)) {
      throw new Error(`${resolver.name} must be decorated with @Resolver()`)
    }
    const instance = new (resolver as unknown as new () => unknown)()
    for (const op of getOpMetadata(resolver)) {
      switch (op.kind) {
        case 'list': {
          const set = ensure(op.model as Function)
          queryFields[listFieldName(set.typeName)] = buildListField(set)
          break
        }
        case 'get': {
          const set = ensure(op.model as Function)
          queryFields[singleFieldName(set.typeName)] = buildGetField(set)
          break
        }
        case 'create': {
          const set = ensure(op.model as Function)
          mutationFields[createMutationName(set.typeName)] = buildCreateField(set)
          break
        }
        case 'update': {
          const set = ensure(op.model as Function)
          mutationFields[updateMutationName(set.typeName)] = buildUpdateField(set)
          break
        }
        case 'delete': {
          const set = ensure(op.model as Function)
          mutationFields[deleteMutationName(set.typeName)] = buildDeleteField(set)
          break
        }
        case 'query':
          queryFields[op.methodKey] = buildCustomField(resolver, instance, op, ensure)
          break
        case 'mutation':
          mutationFields[op.methodKey] = buildCustomField(resolver, instance, op, ensure)
          break
      }
    }
  }

  if (Object.keys(queryFields).length === 0) {
    throw new Error('buildSchema requires at least one query')
  }

  return new GraphQLSchema({
    query: new GraphQLObjectType({ name: 'Query', fields: queryFields }),
    mutation:
      Object.keys(mutationFields).length > 0
        ? new GraphQLObjectType({ name: 'Mutation', fields: mutationFields })
        : undefined,
  })
}
