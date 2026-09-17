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
function generated(kind, model) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, { kind, methodKey: String(methodKey), model });
    };
}
function GqlList(model) {
    return generated('list', model);
}
function GqlGet(model) {
    return generated('get', model);
}
function GqlCreate(model) {
    return generated('create', model);
}
function GqlUpdate(model) {
    return generated('update', model);
}
function GqlDelete(model) {
    return generated('delete', model);
}
function GqlQuery(returnType) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, {
            kind: 'query',
            methodKey: String(methodKey),
            returnType,
        });
    };
}
function GqlMutation(returnType) {
    return (target, methodKey) => {
        (0, metadata_1.addOpMetadata)(target.constructor, {
            kind: 'mutation',
            methodKey: String(methodKey),
            returnType,
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