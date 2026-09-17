"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leafOutputType = leafOutputType;
exports.leafInputType = leafInputType;
const graphql_1 = require("graphql");
const scalars_1 = require("./scalars");
const shared_1 = require("./shared");
function leafOutputType(type) {
    switch (type) {
        case 'string':
        case 'keyword':
            return graphql_1.GraphQLString;
        case 'number':
            return graphql_1.GraphQLFloat;
        case 'boolean':
            return graphql_1.GraphQLBoolean;
        case 'date':
            return scalars_1.GraphQLDateTime;
        case 'dateOnly':
            return graphql_1.GraphQLString;
        case 'stringArray':
            return new graphql_1.GraphQLList(graphql_1.GraphQLString);
        case 'stringMap':
            return scalars_1.GraphQLJSON;
        case 'geoPoint':
            return shared_1.GeoPoint;
        case 'object':
        case 'objectArray':
        case 'vector':
            return undefined;
    }
}
function leafInputType(type) {
    switch (type) {
        case 'string':
        case 'keyword':
            return graphql_1.GraphQLString;
        case 'number':
            return graphql_1.GraphQLFloat;
        case 'boolean':
            return graphql_1.GraphQLBoolean;
        case 'date':
            return scalars_1.GraphQLDateTime;
        case 'dateOnly':
            return graphql_1.GraphQLString;
        case 'stringArray':
            return new graphql_1.GraphQLList(graphql_1.GraphQLString);
        case 'stringMap':
            return scalars_1.GraphQLJSON;
        case 'geoPoint':
            return shared_1.GeoPointInput;
        case 'object':
        case 'objectArray':
        case 'vector':
            return undefined;
    }
}
//# sourceMappingURL=infer.js.map