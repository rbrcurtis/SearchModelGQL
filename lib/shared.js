"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoPointInput = exports.GeoPoint = exports.SortInput = exports.PaginationInput = exports.SortDirection = void 0;
const graphql_1 = require("graphql");
exports.SortDirection = new graphql_1.GraphQLEnumType({
    name: 'SortDirection',
    description: 'Sort order for list queries.',
    values: {
        ASC: { value: 'ASC', description: 'Ascending order.' },
        DESC: { value: 'DESC', description: 'Descending order.' },
    },
});
exports.PaginationInput = new graphql_1.GraphQLInputObjectType({
    name: 'PaginationInput',
    description: 'Page-based pagination. Pages are one-based: page 1 returns the first `limit` results.',
    fields: {
        page: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt),
            defaultValue: 1,
            description: 'One-based page number. Page 1 is the first page.',
        },
        limit: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt),
            defaultValue: 1000,
            description: 'Results per page. Clamped to a maximum of 1000.',
        },
    },
});
exports.SortInput = new graphql_1.GraphQLInputObjectType({
    name: 'SortInput',
    description: 'Sort a list query by one field.',
    fields: {
        field: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
            description: 'Model field name to sort by.',
        },
        direction: {
            type: new graphql_1.GraphQLNonNull(exports.SortDirection),
            defaultValue: 'DESC',
            description: 'Sort direction.',
        },
    },
});
exports.GeoPoint = new graphql_1.GraphQLObjectType({
    name: 'GeoPoint',
    description: 'A latitude/longitude geographic point.',
    fields: {
        lat: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat), description: 'Latitude.' },
        lon: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat), description: 'Longitude.' },
    },
});
exports.GeoPointInput = new graphql_1.GraphQLInputObjectType({
    name: 'GeoPointInput',
    description: 'A latitude/longitude geographic point.',
    fields: {
        lat: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat), description: 'Latitude.' },
        lon: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLFloat), description: 'Longitude.' },
    },
});
//# sourceMappingURL=shared.js.map