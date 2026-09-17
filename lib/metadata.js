"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFieldMetadata = addFieldMetadata;
exports.getFieldMetadataForClass = getFieldMetadataForClass;
exports.setTypeName = setTypeName;
exports.getTypeName = getTypeName;
exports.markResolver = markResolver;
exports.isResolverClass = isResolverClass;
exports.addOpMetadata = addOpMetadata;
exports.getOpMetadata = getOpMetadata;
exports.addArgMetadata = addArgMetadata;
exports.getArgMetadata = getArgMetadata;
require("reflect-metadata");
const FIELDS_KEY = Symbol('search-model-gql:fields');
const TYPE_NAME_KEY = Symbol('search-model-gql:typeName');
const RESOLVER_KEY = Symbol('search-model-gql:resolver');
const OPS_KEY = Symbol('search-model-gql:ops');
const ARGS_KEY = Symbol('search-model-gql:args');
function addFieldMetadata(prototype, meta) {
    const existing = Reflect.getOwnMetadata(FIELDS_KEY, prototype) ?? [];
    Reflect.defineMetadata(FIELDS_KEY, [...existing, meta], prototype);
}
function getFieldMetadataForClass(ctor) {
    const levels = [];
    let proto = ctor.prototype;
    while (proto && proto !== Object.prototype) {
        levels.unshift(proto);
        proto = Object.getPrototypeOf(proto);
    }
    const result = [];
    for (const level of levels) {
        const own = Reflect.getOwnMetadata(FIELDS_KEY, level);
        if (own)
            result.push(...own);
    }
    return result;
}
function setTypeName(ctor, name) {
    Reflect.defineMetadata(TYPE_NAME_KEY, name, ctor);
}
function getTypeName(ctor) {
    const explicit = Reflect.getOwnMetadata(TYPE_NAME_KEY, ctor);
    return explicit ?? ctor.name;
}
function markResolver(ctor) {
    Reflect.defineMetadata(RESOLVER_KEY, true, ctor);
}
function isResolverClass(ctor) {
    return Reflect.getOwnMetadata(RESOLVER_KEY, ctor) === true;
}
function addOpMetadata(ctor, meta) {
    const existing = Reflect.getOwnMetadata(OPS_KEY, ctor) ?? [];
    Reflect.defineMetadata(OPS_KEY, [...existing, meta], ctor);
}
function getOpMetadata(ctor) {
    return Reflect.getOwnMetadata(OPS_KEY, ctor) ?? [];
}
function addArgMetadata(ctor, meta) {
    const existing = Reflect.getOwnMetadata(ARGS_KEY, ctor) ?? [];
    Reflect.defineMetadata(ARGS_KEY, [...existing, meta], ctor);
}
function getArgMetadata(ctor, methodKey) {
    const all = Reflect.getOwnMetadata(ARGS_KEY, ctor) ?? [];
    return all
        .filter((a) => a.methodKey === methodKey)
        .sort((a, b) => a.parameterIndex - b.parameterIndex);
}
//# sourceMappingURL=metadata.js.map