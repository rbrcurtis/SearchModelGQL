"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLJSON = exports.GraphQLDateTime = void 0;
const graphql_1 = require("graphql");
exports.GraphQLDateTime = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'An ISO-8601 date-time string, for example "2025-01-31T14:00:00.000Z".',
    serialize(value) {
        if (value instanceof Date)
            return value.toISOString();
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                throw new TypeError(`DateTime cannot represent value: ${value}`);
            }
            return parsed.toISOString();
        }
        throw new TypeError(`DateTime cannot represent value: ${String(value)}`);
    },
    parseValue(value) {
        if (typeof value !== 'string') {
            throw new TypeError('DateTime must be an ISO-8601 string');
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new TypeError(`Invalid DateTime: ${value}`);
        }
        return parsed;
    },
    parseLiteral(ast) {
        if (ast.kind !== graphql_1.Kind.STRING) {
            throw new TypeError('DateTime must be an ISO-8601 string literal');
        }
        const parsed = new Date(ast.value);
        if (Number.isNaN(parsed.getTime())) {
            throw new TypeError(`Invalid DateTime: ${ast.value}`);
        }
        return parsed;
    },
});
function parseJsonLiteral(ast) {
    switch (ast.kind) {
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.BOOLEAN:
            return ast.value;
        case graphql_1.Kind.INT:
        case graphql_1.Kind.FLOAT:
            return Number(ast.value);
        case graphql_1.Kind.NULL:
            return null;
        case graphql_1.Kind.LIST:
            return ast.values.map(parseJsonLiteral);
        case graphql_1.Kind.OBJECT:
            return Object.fromEntries(ast.fields.map((f) => [f.name.value, parseJsonLiteral(f.value)]));
        default:
            return null;
    }
}
exports.GraphQLJSON = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value.',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: parseJsonLiteral,
});
//# sourceMappingURL=scalars.js.map