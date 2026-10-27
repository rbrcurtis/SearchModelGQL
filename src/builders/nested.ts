import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql'
import type {
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql'
import { leafInputType, leafOutputType } from '../infer'
import { upperFirst } from '../naming'
import type { SearchFieldMetadata } from '../searchModel'

type NestedProperties = Record<string, SearchFieldMetadata>

/** Output type for a nested search-model property. */
function outputTypeForProperty(
  parentName: string,
  key: string,
  property: SearchFieldMetadata
): GraphQLOutputType {
  if (property.type === 'object' && property.options?.properties) {
    return buildNestedOutputType(`${parentName}${upperFirst(key)}`, property.options.properties)
  }
  if (property.type === 'objectArray' && property.options?.properties) {
    return new GraphQLList(
      new GraphQLNonNull(
        buildNestedOutputType(`${parentName}${upperFirst(key)}`, property.options.properties)
      )
    )
  }
  const leaf = leafOutputType(property.type)
  if (!leaf) {
    throw new Error(`Unsupported nested output field type: ${property.type}`)
  }
  return leaf
}

/**
 * Build a GraphQL object type from nested search-model `object`/`objectArray`
 * property definitions. Required nested properties become non-null.
 */
export function buildNestedOutputType(
  name: string,
  properties: NestedProperties,
  description?: string
): GraphQLObjectType {
  return new GraphQLObjectType({
    name,
    description,
    fields: () => {
      const fields: Record<string, { type: GraphQLOutputType }> = {}
      for (const [key, property] of Object.entries(properties)) {
        const type = outputTypeForProperty(name, key, property)
        fields[key] = {
          type: property.options?.required ? new GraphQLNonNull(type) : type,
        }
      }
      return fields
    },
  })
}

/**
 * Input type for a nested search-model property. Nested input properties are
 * always nullable so the same nested input type serves both create and update.
 * search-model validates required nested properties at save time.
 */
function inputTypeForProperty(
  parentName: string,
  key: string,
  property: SearchFieldMetadata
): GraphQLInputType {
  if (property.type === 'object' && property.options?.properties) {
    return buildNestedInputType(`${parentName}${upperFirst(key)}Input`, property.options.properties)
  }
  if (property.type === 'objectArray' && property.options?.properties) {
    return new GraphQLList(
      new GraphQLNonNull(
        buildNestedInputType(`${parentName}${upperFirst(key)}Input`, property.options.properties)
      )
    )
  }
  const leaf = leafInputType(property.type)
  if (!leaf) {
    throw new Error(`Unsupported nested input field type: ${property.type}`)
  }
  return leaf
}

/**
 * Build a GraphQL input type from nested search-model property definitions.
 * `description` is the exposing field's description, when it has one.
 */
export function buildNestedInputType(
  name: string,
  properties: NestedProperties,
  description?: string
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name,
    description,
    fields: () => {
      const fields: GraphQLInputFieldConfigMap = {}
      for (const [key, property] of Object.entries(properties)) {
        fields[key] = { type: inputTypeForProperty(name, key, property) }
      }
      return fields
    },
  })
}
