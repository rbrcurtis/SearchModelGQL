import { GraphQLScalarType, Kind } from 'graphql';
export const GraphQLDateTime = new GraphQLScalarType({
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
        if (ast.kind !== Kind.STRING) {
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
        case Kind.STRING:
        case Kind.BOOLEAN:
            return ast.value;
        case Kind.INT:
        case Kind.FLOAT:
            return Number(ast.value);
        case Kind.NULL:
            return null;
        case Kind.LIST:
            return ast.values.map(parseJsonLiteral);
        case Kind.OBJECT:
            return Object.fromEntries(ast.fields.map((f) => [f.name.value, parseJsonLiteral(f.value)]));
        default:
            return null;
    }
}
export const GraphQLJSON = new GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value.',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: parseJsonLiteral,
});
//# sourceMappingURL=scalars.js.map