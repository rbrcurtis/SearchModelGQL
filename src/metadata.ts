import 'reflect-metadata'
import type { GraphQLInputType, GraphQLOutputType } from 'graphql'
import type { AuthHook, GqlOpOptions } from './auth'

/** Metadata keys. Symbols keep our metadata separate from search-model's. */
const FIELDS_KEY = Symbol('search-model-gql:fields')
const TYPE_NAME_KEY = Symbol('search-model-gql:typeName')
const RESOLVER_KEY = Symbol('search-model-gql:resolver')
const OPS_KEY = Symbol('search-model-gql:ops')
const ARGS_KEY = Symbol('search-model-gql:args')

/**
 * Options for `@GqlExpose`.
 *
 * `output` defaults to true and `input` defaults to false. A field with no
 * `@GqlExpose` is not part of the schema (default-deny).
 */
export interface GqlExposeOptions {
  /** Include this field in the output object type. Default: true. */
  output?: boolean
  /** Include this field in the create/update input types. Default: false. */
  input?: boolean
  /** Force the field nullable. Default: inferred from search-model `required`. */
  nullable?: boolean
  /** GraphQL field description. */
  description?: string
  /**
   * Explicit GraphQL type. Required for enums and computed fields that have no
   * search-model decorator to infer from. May return a search-model class for
   * resolver return types; field types must be concrete GraphQL types.
   */
  type?: () => GraphQLOutputType | GraphQLInputType
}

/** Exposure metadata recorded by `@GqlExpose` for one model field. */
export interface GqlFieldMetadata extends GqlExposeOptions {
  propertyKey: string
}

/** Kinds of operations a resolver can declare. */
export type GeneratedOpKind = 'list' | 'get' | 'create' | 'update' | 'delete'
export type CustomOpKind = 'query' | 'mutation'
export type OpKind = GeneratedOpKind | CustomOpKind

/** Operation metadata recorded by the resolver decorators. */
export interface OpMetadata {
  kind: OpKind
  methodKey: string
  /** Target model for generated operations. */
  model?: Function
  /** Return type thunk for custom operations. */
  returnType?: () => unknown
  /** Authorization hook; absent means the operation is open. */
  auth?: AuthHook
  /** List-only extra terms narrowing the result set. */
  filter?: GqlOpOptions['filter']
  /** Extra save()/delete() meta for this operation. */
  meta?: GqlOpOptions['meta']
}

/** Argument metadata recorded by `@Arg` and `@Ctx`. */
export interface ArgMetadata {
  methodKey: string
  parameterIndex: number
  name?: string
  type?: () => unknown
  nullable?: boolean
  defaultValue?: unknown
  description?: string
  isContext?: boolean
}

export function addFieldMetadata(prototype: object, meta: GqlFieldMetadata): void {
  const existing: GqlFieldMetadata[] = Reflect.getOwnMetadata(FIELDS_KEY, prototype) ?? []
  Reflect.defineMetadata(FIELDS_KEY, [...existing, meta], prototype)
}

/**
 * Read exposure metadata for a model class, including inherited exposures.
 * Base-class fields come first so subclasses can override by property name.
 */
export function getFieldMetadataForClass(ctor: Function): GqlFieldMetadata[] {
  const levels: object[] = []
  let proto: object | null = ctor.prototype
  while (proto && proto !== Object.prototype) {
    levels.unshift(proto)
    proto = Object.getPrototypeOf(proto)
  }
  const result: GqlFieldMetadata[] = []
  for (const level of levels) {
    const own: GqlFieldMetadata[] | undefined = Reflect.getOwnMetadata(FIELDS_KEY, level)
    if (own) result.push(...own)
  }
  return result
}

export function setTypeName(ctor: Function, name: string): void {
  Reflect.defineMetadata(TYPE_NAME_KEY, name, ctor)
}

export function getTypeName(ctor: Function): string {
  const explicit: string | undefined = Reflect.getOwnMetadata(TYPE_NAME_KEY, ctor)
  return explicit ?? ctor.name
}

export function markResolver(ctor: Function): void {
  Reflect.defineMetadata(RESOLVER_KEY, true, ctor)
}

export function isResolverClass(ctor: Function): boolean {
  return Reflect.getOwnMetadata(RESOLVER_KEY, ctor) === true
}

export function addOpMetadata(ctor: Function, meta: OpMetadata): void {
  const existing: OpMetadata[] = Reflect.getOwnMetadata(OPS_KEY, ctor) ?? []
  Reflect.defineMetadata(OPS_KEY, [...existing, meta], ctor)
}

export function getOpMetadata(ctor: Function): OpMetadata[] {
  return Reflect.getOwnMetadata(OPS_KEY, ctor) ?? []
}

export function addArgMetadata(ctor: Function, meta: ArgMetadata): void {
  const existing: ArgMetadata[] = Reflect.getOwnMetadata(ARGS_KEY, ctor) ?? []
  Reflect.defineMetadata(ARGS_KEY, [...existing, meta], ctor)
}

export function getArgMetadata(ctor: Function, methodKey: string): ArgMetadata[] {
  const all: ArgMetadata[] = Reflect.getOwnMetadata(ARGS_KEY, ctor) ?? []
  return all
    .filter((a) => a.methodKey === methodKey)
    .sort((a, b) => a.parameterIndex - b.parameterIndex)
}

export type { GraphQLInputType, GraphQLOutputType }
