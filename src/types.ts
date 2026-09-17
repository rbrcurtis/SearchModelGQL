import type { SortDirectionValue } from './values'

/** Page-based pagination arguments, matching `PaginationInput`. */
export interface PaginationArgs {
  /** One-based page number. */
  page?: number
  /** Results per page, capped at 1000. */
  limit?: number
}

/** Sort arguments, matching `SortInput`. */
export interface SortArgs {
  field: string
  direction: SortDirectionValue
}

/** Result shape of every generated list query. */
export interface ListResult<T> {
  hits: T[]
  total: number
  page: number
}

/**
 * Typed handle for a `@GqlList` field. Use it as the type of the `declare` field
 * so the resolver class reads as documentation.
 */
export type ListQuery<T> = (args?: {
  search?: string
  pagination?: PaginationArgs
  sort?: SortArgs
}) => Promise<ListResult<T>>

/** Typed handle for a `@GqlGet` field. */
export type GetQuery<T> = (args: { id: string }) => Promise<T | null>

/** Typed handle for a `@GqlCreate` field. */
export type CreateMutation<T> = (args: { input: Record<string, unknown> }) => Promise<T>

/** Typed handle for a `@GqlUpdate` field. */
export type UpdateMutation<T> = (args: {
  id: string
  input: Record<string, unknown>
}) => Promise<T>

/** Typed handle for a `@GqlDelete` field. */
export type DeleteMutation<T> = (args: { id: string }) => Promise<boolean>
