export function lowerFirst(value) {
    if (!value)
        return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
}
export function upperFirst(value) {
    if (!value)
        return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}
export function listFieldName(typeName) {
    return `${lowerFirst(typeName)}s`;
}
export function singleFieldName(typeName) {
    return lowerFirst(typeName);
}
export function createMutationName(typeName) {
    return `create${upperFirst(typeName)}`;
}
export function updateMutationName(typeName) {
    return `update${upperFirst(typeName)}`;
}
export function deleteMutationName(typeName) {
    return `delete${upperFirst(typeName)}`;
}
//# sourceMappingURL=naming.js.map