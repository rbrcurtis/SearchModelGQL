"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNestedOutputType = buildNestedOutputType;
exports.buildNestedInputType = buildNestedInputType;
const graphql_1 = require("graphql");
const infer_1 = require("../infer");
const naming_1 = require("../naming");
function outputTypeForProperty(parentName, key, property) {
    if (property.type === 'object' && property.options?.properties) {
        return buildNestedOutputType(`${parentName}${(0, naming_1.upperFirst)(key)}`, property.options.properties);
    }
    if (property.type === 'objectArray' && property.options?.properties) {
        return new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(buildNestedOutputType(`${parentName}${(0, naming_1.upperFirst)(key)}`, property.options.properties)));
    }
    const leaf = (0, infer_1.leafOutputType)(property.type);
    if (!leaf) {
        throw new Error(`Unsupported nested output field type: ${property.type}`);
    }
    return leaf;
}
function buildNestedOutputType(name, properties) {
    return new graphql_1.GraphQLObjectType({
        name,
        fields: () => {
            const fields = {};
            for (const [key, property] of Object.entries(properties)) {
                const type = outputTypeForProperty(name, key, property);
                fields[key] = {
                    type: property.options?.required ? new graphql_1.GraphQLNonNull(type) : type,
                };
            }
            return fields;
        },
    });
}
function inputTypeForProperty(parentName, key, property) {
    if (property.type === 'object' && property.options?.properties) {
        return buildNestedInputType(`${parentName}${(0, naming_1.upperFirst)(key)}Input`, property.options.properties);
    }
    if (property.type === 'objectArray' && property.options?.properties) {
        return new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(buildNestedInputType(`${parentName}${(0, naming_1.upperFirst)(key)}Input`, property.options.properties)));
    }
    const leaf = (0, infer_1.leafInputType)(property.type);
    if (!leaf) {
        throw new Error(`Unsupported nested input field type: ${property.type}`);
    }
    return leaf;
}
function buildNestedInputType(name, properties) {
    return new graphql_1.GraphQLInputObjectType({
        name,
        fields: () => {
            const fields = {};
            for (const [key, property] of Object.entries(properties)) {
                fields[key] = { type: inputTypeForProperty(name, key, property) };
            }
            return fields;
        },
    });
}
//# sourceMappingURL=nested.js.map