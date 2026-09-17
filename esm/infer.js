import { GraphQLBoolean, GraphQLFloat, GraphQLList, GraphQLString } from 'graphql';
import { GraphQLDateTime, GraphQLJSON } from './scalars';
import { GeoPoint, GeoPointInput } from './shared';
export function leafOutputType(type) {
    switch (type) {
        case 'string':
        case 'keyword':
            return GraphQLString;
        case 'number':
            return GraphQLFloat;
        case 'boolean':
            return GraphQLBoolean;
        case 'date':
            return GraphQLDateTime;
        case 'dateOnly':
            return GraphQLString;
        case 'stringArray':
            return new GraphQLList(GraphQLString);
        case 'stringMap':
            return GraphQLJSON;
        case 'geoPoint':
            return GeoPoint;
        case 'object':
        case 'objectArray':
        case 'vector':
            return undefined;
    }
}
export function leafInputType(type) {
    switch (type) {
        case 'string':
        case 'keyword':
            return GraphQLString;
        case 'number':
            return GraphQLFloat;
        case 'boolean':
            return GraphQLBoolean;
        case 'date':
            return GraphQLDateTime;
        case 'dateOnly':
            return GraphQLString;
        case 'stringArray':
            return new GraphQLList(GraphQLString);
        case 'stringMap':
            return GraphQLJSON;
        case 'geoPoint':
            return GeoPointInput;
        case 'object':
        case 'objectArray':
        case 'vector':
            return undefined;
    }
}
//# sourceMappingURL=infer.js.map