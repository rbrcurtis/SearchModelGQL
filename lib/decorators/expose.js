"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GqlExpose = GqlExpose;
exports.GqlType = GqlType;
exports.gqlEnum = gqlEnum;
const graphql_1 = require("graphql");
const metadata_1 = require("../metadata");
function GqlExpose(options = {}) {
    return (target, propertyKey) => {
        (0, metadata_1.addFieldMetadata)(target, { ...options, propertyKey });
    };
}
function GqlType(name, options = {}) {
    return (target) => {
        (0, metadata_1.setTypeName)(target, name ?? target.name);
        (0, metadata_1.setTypeDescription)(target, options.description);
    };
}
function enumMemberName(value) {
    const sanitized = value.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
    return /^[A-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
}
function gqlEnum(name, values) {
    return new graphql_1.GraphQLEnumType({
        name,
        values: Object.fromEntries(values.map((value) => [enumMemberName(value), { value }])),
    });
}
//# sourceMappingURL=expose.js.map