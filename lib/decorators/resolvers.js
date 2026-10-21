"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resolver = Resolver;
exports.GqlList = GqlList;
exports.GqlGet = GqlGet;
exports.GqlCreate = GqlCreate;
exports.GqlUpdate = GqlUpdate;
exports.GqlDelete = GqlDelete;
exports.GqlQuery = GqlQuery;
exports.GqlMutation = GqlMutation;
exports.Arg = Arg;
exports.Ctx = Ctx;
const metadata_1 = require("../metadata");
function Resolver() {
    return (target) => {
        (0, metadata_1.markResolver)(target);
    };
}
function generated(kind, model, options = {}) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, {
            kind,
            methodKey: String(methodKey),
            model,
            auth: options.auth,
            filter: options.filter,
        });
    };
}
function GqlList(model, options = {}) {
    return generated('list', model, options);
}
function GqlGet(model, options = {}) {
    return generated('get', model, options);
}
function GqlCreate(model, options = {}) {
    return generated('create', model, options);
}
function GqlUpdate(model, options = {}) {
    return generated('update', model, options);
}
function GqlDelete(model, options = {}) {
    return generated('delete', model, options);
}
function GqlQuery(returnType, options = {}) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, {
            kind: 'query',
            methodKey: String(methodKey),
            returnType,
            auth: options.auth,
        });
    };
}
function GqlMutation(returnType, options = {}) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, {
            kind: 'mutation',
            methodKey: String(methodKey),
            returnType,
            auth: options.auth,
        });
    };
}
function Arg(name, type, options = {}) {
    return (target, methodKey, parameterIndex) => {
        (0, metadata_1.addArgMetadata)(target.constructor, {
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
function Ctx() {
    return (target, methodKey, parameterIndex) => {
        (0, metadata_1.addArgMetadata)(target.constructor, {
            methodKey: String(methodKey),
            parameterIndex,
            isContext: true,
        });
    };
}
//# sourceMappingURL=resolvers.js.map