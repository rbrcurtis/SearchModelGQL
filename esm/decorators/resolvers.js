import { addArgMetadata, addOpMetadata, markResolver } from '../metadata';
export function Resolver() {
    return (target) => {
        markResolver(target);
    };
}
function generated(kind, model) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, { kind, methodKey: String(methodKey), model });
    };
}
export function GqlList(model) {
    return generated('list', model);
}
export function GqlGet(model) {
    return generated('get', model);
}
export function GqlCreate(model) {
    return generated('create', model);
}
export function GqlUpdate(model) {
    return generated('update', model);
}
export function GqlDelete(model) {
    return generated('delete', model);
}
export function GqlQuery(returnType) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, {
            kind: 'query',
            methodKey: String(methodKey),
            returnType,
        });
    };
}
export function GqlMutation(returnType) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, {
            kind: 'mutation',
            methodKey: String(methodKey),
            returnType,
        });
    };
}
export function Arg(name, type, options = {}) {
    return (target, methodKey, parameterIndex) => {
        addArgMetadata(target.constructor, {
            methodKey: String(methodKey),
            parameterIndex,
            name,
            type,
            nullable: options.nullable,
            defaultValue: options.defaultValue,
            description: options.description,
        });
    };
}
export function Ctx() {
    return (target, methodKey, parameterIndex) => {
        addArgMetadata(target.constructor, {
            methodKey: String(methodKey),
            parameterIndex,
            isContext: true,
        });
    };
}
//# sourceMappingURL=resolvers.js.map