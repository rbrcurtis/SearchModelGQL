"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lowerFirst = lowerFirst;
exports.upperFirst = upperFirst;
exports.listFieldName = listFieldName;
exports.singleFieldName = singleFieldName;
exports.createMutationName = createMutationName;
exports.updateMutationName = updateMutationName;
exports.deleteMutationName = deleteMutationName;
function lowerFirst(value) {
    if (!value)
        return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
}
function upperFirst(value) {
    if (!value)
        return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
function listFieldName(typeName) {
    return `${lowerFirst(typeName)}s`;
}
function singleFieldName(typeName) {
    return lowerFirst(typeName);
}
function createMutationName(typeName) {
    return `create${upperFirst(typeName)}`;
}
function updateMutationName(typeName) {
    return `update${upperFirst(typeName)}`;
}
function deleteMutationName(typeName) {
    return `delete${upperFirst(typeName)}`;
}
//# sourceMappingURL=naming.js.map