import { GraphQLEnumType } from 'graphql'
import { addFieldMetadata, setTypeName } from '../metadata'
import type { GqlExposeOptions } from '../metadata'

/**
 * Expose a search-model field on the generated GraphQL types.
 *
 * The GraphQL type is inferred from the search-model decorator on the same
 * field. Pass `type` for enums or computed fields that have no search-model
 * decorator. A field with no `@GqlExpose` is not part of the schema.
 *
 * @example
 * ```ts
 * @KeywordType({ required: true })
 * @GqlExpose({ input: true })
 * authorId!: string
 * ```
 */
export function GqlExpose(options: GqlExposeOptions = {}) {
  return (target: object, propertyKey: string): void => {
    addFieldMetadata(target, { ...options, propertyKey })
  }
}

/**
 * Override the generated GraphQL type name for a model class.
 * Defaults to the model class name.
 *
 * @example
 * ```ts
 * @GqlType('Post')
 * export class Post extends SearchModel<Post> { ... }
 * ```
 */
export function GqlType(name: string) {
  return (target: Function): void => {
    setTypeName(target, name)
  }
}

function enumMemberName(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()
  return /^[A-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`
}

/**
 * Build a GraphQL enum from string values, for use with `@GqlExpose({ type })`.
 * Member names are upper-snake-cased; member values keep the original string so
 * search-model stores the value you declared.
 *
 * @example
 * ```ts
 * const PostStatus = gqlEnum('PostStatus', ['draft', 'published'])
 * // SDL: enum PostStatus { DRAFT PUBLISHED }
 * ```
 */
export function gqlEnum(name: string, values: readonly string[]): GraphQLEnumType {
  return new GraphQLEnumType({
    name,
    values: Object.fromEntries(values.map((value) => [enumMemberName(value), { value }])),
  })
}
