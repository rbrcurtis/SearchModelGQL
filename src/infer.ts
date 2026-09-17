import { GraphQLBoolean, GraphQLFloat, GraphQLList, GraphQLString } from 'graphql'
import type { GraphQLInputType, GraphQLOutputType } from 'graphql'
import { GraphQLDateTime, GraphQLJSON } from './scalars'
import { GeoPoint, GeoPointInput } from './shared'
import type { SearchFieldMetadata } from './searchModel'

/**
 * Map a search-model scalar field type to a GraphQL output type.
 * Returns undefined for object/objectArray (built separately) and vector
 * (unsupported).
 */
export function leafOutputType(type: SearchFieldMetadata['type']): GraphQLOutputType | undefined {
  switch (type) {
    case 'string':
    case 'keyword':
      return GraphQLString
    case 'number':
      return GraphQLFloat
    case 'boolean':
      return GraphQLBoolean
    case 'date':
      return GraphQLDateTime
    case 'dateOnly':
      // search-model stores date-only as "YYYY-MM-DD"; keep the string form.
      return GraphQLString
    case 'stringArray':
      return new GraphQLList(GraphQLString)
    case 'stringMap':
      return GraphQLJSON
    case 'geoPoint':
      return GeoPoint
    case 'object':
    case 'objectArray':
    case 'vector':
      return undefined
  }
}

/**
 * Map a search-model scalar field type to a GraphQL input type.
 * Returns undefined for object/objectArray and vector.
 */
export function leafInputType(type: SearchFieldMetadata['type']): GraphQLInputType | undefined {
  switch (type) {
    case 'string':
    case 'keyword':
      return GraphQLString
    case 'number':
      return GraphQLFloat
    case 'boolean':
      return GraphQLBoolean
    case 'date':
      return GraphQLDateTime
    case 'dateOnly':
      return GraphQLString
    case 'stringArray':
      return new GraphQLList(GraphQLString)
    case 'stringMap':
      return GraphQLJSON
    case 'geoPoint':
      return GeoPointInput
    case 'object':
    case 'objectArray':
    case 'vector':
      return undefined
  }
}
