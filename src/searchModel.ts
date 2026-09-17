/**
 * Structural interfaces for the OSS `search-model` package.
 *
 * Only the methods the library calls are declared. Using structural types keeps
 * this package decoupled from search-model's deep type parameters.
 */

/** Options accepted by search-model `find` / `findWithTotal`. */
export interface SearchOptionsLike {
  /** Results per page. Default 1000. */
  limit?: number
  /** Sort as `"field:order"`, e.g. `"createdAt:desc"`. */
  sort?: string
  /** One-based page number. */
  page?: number
}

/** The instance side of a search-model document that this library uses. */
export interface SearchModelInstance {
  /** Document id. */
  id: string
  /** Set valid model properties without saving. */
  update(data: Record<string, unknown>): SearchModelInstance
  /** Persist the document. */
  save(options?: { wait?: boolean }): Promise<SearchModelInstance>
  /** Delete the document. */
  delete(): Promise<void>
}

/** The static side of a search-model model class that this library uses. */
export interface SearchModelClass<T extends SearchModelInstance = SearchModelInstance> {
  readonly indexName: string
  new (data?: Record<string, unknown>): T
  create(props: Record<string, unknown>, options?: { wait?: boolean }): Promise<T>
  find(terms: string[], options?: SearchOptionsLike): Promise<T[]>
  findWithTotal(
    terms: string[],
    options?: SearchOptionsLike
  ): Promise<{ hits: T[]; total: number }>
  getById(id: string): Promise<T | null>
}

/** Shape of one search-model field definition, as returned by `getFieldMetadata`. */
export interface SearchFieldMetadata {
  propertyKey: string
  type:
    | 'date'
    | 'dateOnly'
    | 'string'
    | 'number'
    | 'stringArray'
    | 'object'
    | 'objectArray'
    | 'boolean'
    | 'keyword'
    | 'stringMap'
    | 'geoPoint'
    | 'vector'
  options?: {
    required?: boolean
    default?: () => unknown
    properties?: Record<string, SearchFieldMetadata>
  }
}
