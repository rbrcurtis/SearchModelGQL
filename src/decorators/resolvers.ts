import { addArgMetadata, addOpMetadata, markResolver } from '../metadata'
import type { GeneratedOpKind } from '../metadata'
import type { GqlOpOptions } from '../auth'

/**
 * Mark a class as a resolver. `buildSchema` reads operation metadata from
 * classes decorated with `@Resolver()`.
 */
export function Resolver(): ClassDecorator {
  return (target) => {
    markResolver(target)
  }
}

function generated(kind: GeneratedOpKind, model: Function, options: GqlOpOptions = {}) {
  return (target: object, methodKey: string | symbol): void => {
    addOpMetadata(target.constructor, {
      kind,
      methodKey: String(methodKey),
      model,
      auth: options.auth,
      filter: options.filter,
      meta: options.meta,
    })
  }
}

/**
 * Generate the standard list query for a model:
 * `{entities}(search, pagination, sort): {Model}ListResult!`.
 */
export function GqlList(
  model: Function,
  options: GqlOpOptions = {}
): PropertyDecorator {
  return generated('list', model, options)
}

/**
 * Generate the standard single-item query for a model: `{entity}(id): {Model}`.
 */
export function GqlGet(
  model: Function,
  options: GqlOpOptions = {}
): PropertyDecorator {
  return generated('get', model, options)
}

/**
 * Generate the standard create mutation:
 * `create{Model}(input: Create{Model}Input!): {Model}!`.
 */
export function GqlCreate(
  model: Function,
  options: GqlOpOptions = {}
): PropertyDecorator {
  return generated('create', model, options)
}

/**
 * Generate the standard update mutation:
 * `update{Model}(id: ID!, input: Update{Model}Input!): {Model}!`.
 */
export function GqlUpdate(
  model: Function,
  options: GqlOpOptions = {}
): PropertyDecorator {
  return generated('update', model, options)
}

/**
 * Generate the standard delete mutation: `delete{Model}(id: ID!): Boolean!`.
 */
export function GqlDelete(
  model: Function,
  options: GqlOpOptions = {}
): PropertyDecorator {
  return generated('delete', model, options)
}

/**
 * Declare a custom query. The method name becomes the query field name. The
 * return type thunk may return a GraphQL type or a search-model class (mapped to
 * its generated output type).
 */
export function GqlQuery(
  returnType: () => unknown,
  options: GqlOpOptions = {}
): MethodDecorator {
  return (target, methodKey) => {
    addOpMetadata(target.constructor, {
      kind: 'query',
      methodKey: String(methodKey),
      returnType,
      auth: options.auth,
    })
  }
}

/** Declare a custom mutation. See {@link GqlQuery}. */
export function GqlMutation(
  returnType: () => unknown,
  options: GqlOpOptions = {}
): MethodDecorator {
  return (target, methodKey) => {
    addOpMetadata(target.constructor, {
      kind: 'mutation',
      methodKey: String(methodKey),
      returnType,
      auth: options.auth,
    })
  }
}

/** Options for `@Arg`. */
export interface GqlArgOptions {
  /** Allow null. Default: false. */
  nullable?: boolean
  /** GraphQL default value. */
  defaultValue?: unknown
  /** GraphQL argument description. */
  description?: string
}

/**
 * Declare a GraphQL argument for a custom query or mutation parameter. The type
 * thunk may return a GraphQL input type or a search-model class (mapped to its
 * generated create input type).
 */
export function Arg(
  name: string,
  type: () => unknown,
  options: GqlArgOptions = {}
): ParameterDecorator {
  return (target, methodKey, parameterIndex) => {
    addArgMetadata(target.constructor, {
      methodKey: String(methodKey),
      parameterIndex,
      name,
      type,
      nullable: options.nullable,
      defaultValue: options.defaultValue,
      description: options.description,
    })
  }
}

/** Inject the GraphQL context into a custom resolver parameter. */
export function Ctx(): ParameterDecorator {
  return (target, methodKey, parameterIndex) => {
    addArgMetadata(target.constructor, {
      methodKey: String(methodKey),
      parameterIndex,
      isContext: true,
    })
  }
}
