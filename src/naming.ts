/** Convert the first character to lower case. */
export function lowerFirst(value: string): string {
  if (!value) return value
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/** Convert the first character to upper case. */
export function upperFirst(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** List query name for a model type, e.g. `Post` -> `posts`. */
export function listFieldName(typeName: string): string {
  return `${lowerFirst(typeName)}s`
}

/** Single-item query name for a model type, e.g. `Post` -> `post`. */
export function singleFieldName(typeName: string): string {
  return lowerFirst(typeName)
}

/** Create mutation name, e.g. `Post` -> `createPost`. */
export function createMutationName(typeName: string): string {
  return `create${upperFirst(typeName)}`
}

/** Update mutation name, e.g. `Post` -> `updatePost`. */
export function updateMutationName(typeName: string): string {
  return `update${upperFirst(typeName)}`
}

/** Delete mutation name, e.g. `Post` -> `deletePost`. */
export function deleteMutationName(typeName: string): string {
  return `delete${upperFirst(typeName)}`
}
