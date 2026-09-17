import {
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

/** Sort order for list queries. */
export const SortDirection = new GraphQLEnumType({
  name: 'SortDirection',
  description: 'Sort order for list queries.',
  values: {
    ASC: { value: 'ASC', description: 'Ascending order.' },
    DESC: { value: 'DESC', description: 'Descending order.' },
  },
})

/** Offset-free, page-based pagination. Pages are one-based to match search-model. */
export const PaginationInput = new GraphQLInputObjectType({
  name: 'PaginationInput',
  description:
    'Page-based pagination. Pages are one-based: page 1 returns the first `limit` results.',
  fields: {
    page: {
      type: new GraphQLNonNull(GraphQLInt),
      defaultValue: 1,
      description: 'One-based page number. Page 1 is the first page.',
    },
    limit: {
      type: new GraphQLNonNull(GraphQLInt),
      defaultValue: 1000,
      description: 'Results per page. Clamped to a maximum of 1000.',
    },
  },
})

/** Sort by a single field and direction. */
export const SortInput = new GraphQLInputObjectType({
  name: 'SortInput',
  description: 'Sort a list query by one field.',
  fields: {
    field: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Model field name to sort by.',
    },
    direction: {
      type: new GraphQLNonNull(SortDirection),
      defaultValue: 'DESC',
      description: 'Sort direction.',
    },
  },
})

/** Latitude/longitude pair, matching search-model `@GeoPointType`. */
export const GeoPoint = new GraphQLObjectType({
  name: 'GeoPoint',
  description: 'A latitude/longitude geographic point.',
  fields: {
    lat: { type: new GraphQLNonNull(GraphQLFloat), description: 'Latitude.' },
    lon: { type: new GraphQLNonNull(GraphQLFloat), description: 'Longitude.' },
  },
})

/** Input form of {@link GeoPoint}. */
export const GeoPointInput = new GraphQLInputObjectType({
  name: 'GeoPointInput',
  description: 'A latitude/longitude geographic point.',
  fields: {
    lat: { type: new GraphQLNonNull(GraphQLFloat), description: 'Latitude.' },
    lon: { type: new GraphQLNonNull(GraphQLFloat), description: 'Longitude.' },
  },
})
