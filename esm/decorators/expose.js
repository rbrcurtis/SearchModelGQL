import { GraphQLEnumType } from 'graphql';
import { addFieldMetadata, setTypeName } from '../metadata';
export function GqlExpose(options = {}) {
    return (target, propertyKey) => {
        addFieldMetadata(target, { ...options, propertyKey });
    };
}
export function GqlType(name) {
    return (target) => {
        setTypeName(target, name);
    };
}
function enumMemberName(value) {
    const sanitized = value.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
    return /^[A-Z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
}
export function gqlEnum(name, values) {
    return new GraphQLEnumType({
        name,
        values: Object.fromEntries(values.map((value) => [enumMemberName(value), { value }])),
    });
}
//# sourceMappingURL=expose.js.map