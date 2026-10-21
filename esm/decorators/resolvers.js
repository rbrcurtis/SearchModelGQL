import { addArgMetadata, addOpMetadata, markResolver } from '../metadata';
export function Resolver() {
    return (target) => {
        markResolver(target);
    };
}
function generated(kind, model, options = {}) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, {
            kind,
            methodKey: String(methodKey),
            model,
            auth: options.auth,
            filter: options.filter,
        });
    };
}
export function GqlList(model, options = {}) {
    return generated('list', model, options);
}
export function GqlGet(model, options = {}) {
    return generated('get', model, options);
}
export function GqlCreate(model, options = {}) {
    return generated('create', model, options);
}
export function GqlUpdate(model, options = {}) {
    return generated('update', model, options);
}
export function GqlDelete(model, options = {}) {
    return generated('delete', model, options);
}
export function GqlQuery(returnType, options = {}) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, {
            kind: 'query',
            methodKey: String(methodKey),
            returnType,
            auth: options.auth,
        });
    };
}
export function GqlMutation(returnType, options = {}) {
    return (target, methodKey) => {
        addOpMetadata(target.constructor, {
            kind: 'mutation',
            methodKey: String(methodKey),
            returnType,
            auth: options.auth,
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