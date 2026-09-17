"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModelTypes = buildModelTypes;
const search_model_1 = require("search-model");
const graphql_1 = require("graphql");
const metadata_1 = require("../metadata");
const infer_1 = require("../infer");
const naming_1 = require("../naming");
const nested_1 = require("./nested");
function outputFieldType(typeName, exposure, searchField) {
    if (exposure.type)
        return exposure.type();
    if (!searchField) {
        throw new Error(`Field "${exposure.propertyKey}" on ${typeName} has no search-model decorator and no explicit type`);
    }
    if (searchField.type === 'object' && searchField.options?.properties) {
        return (0, nested_1.buildNestedOutputType)(`${typeName}${(0, naming_1.upperFirst)(exposure.propertyKey)}`, searchField.options.properties);
    }
    if (searchField.type === 'objectArray' && searchField.options?.properties) {
        return new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull((0, nested_1.buildNestedOutputType)(`${typeName}${(0, naming_1.upperFirst)(exposure.propertyKey)}`, searchField.options.properties)));
    }
    const leaf = (0, infer_1.leafOutputType)(searchField.type);
    if (!leaf) {
        throw new Error(`Field "${exposure.propertyKey}" on ${typeName} has unsupported type "${searchField.type}"`);
    }
    return leaf;
}
function inputFieldType(typeName, exposure, searchField) {
    if (exposure.type)
        return exposure.type();
    if (!searchField) {
        throw new Error(`Field "${exposure.propertyKey}" on ${typeName} has no search-model decorator and no explicit type`);
    }
    if (searchField.type === 'object' && searchField.options?.properties) {
        return (0, nested_1.buildNestedInputType)(`${typeName}${(0, naming_1.upperFirst)(exposure.propertyKey)}Input`, searchField.options.properties);
    }
    if (searchField.type === 'objectArray' && searchField.options?.properties) {
        return new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull((0, nested_1.buildNestedInputType)(`${typeName}${(0, naming_1.upperFirst)(exposure.propertyKey)}Input`, searchField.options.properties)));
    }
    const leaf = (0, infer_1.leafInputType)(searchField.type);
    if (!leaf) {
        throw new Error(`Field "${exposure.propertyKey}" on ${typeName} has unsupported type "${searchField.type}"`);
    }
    return leaf;
}
function buildModelTypes(model) {
    const ctor = model;
    const typeName = (0, metadata_1.getTypeName)(ctor);
    const exposures = (0, metadata_1.getFieldMetadataForClass)(ctor);
    const searchFields = (0, search_model_1.getFieldMetadata)(model.prototype);
    const searchByKey = new Map(searchFields.map((f) => [f.propertyKey, f]));
    const outputFields = {
        id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID), description: 'Document id.' },
    };
    const createInputFields = {};
    const updateInputFields = {};
    for (const exposure of exposures) {
        if (exposure.propertyKey === 'id')
            continue;
        const searchField = searchByKey.get(exposure.propertyKey);
        const modelRequired = searchField?.options?.required === true;
        const hasDefault = searchField?.options?.default !== undefined;
        if (exposure.output !== false) {
            const type = outputFieldType(typeName, exposure, searchField);
            const nonNull = exposure.nullable === true
                ? false
                : searchField
                    ? modelRequired
                    : exposure.nullable === false;
            outputFields[exposure.propertyKey] = {
                type: nonNull ? new graphql_1.GraphQLNonNull(type) : type,
                description: exposure.description,
            };
        }
        if (exposure.input === true) {
            const type = inputFieldType(typeName, exposure, searchField);
            const createNonNull = exposure.nullable === true
                ? false
                : searchField
                    ? modelRequired && !hasDefault
                    : exposure.nullable === false;
            createInputFields[exposure.propertyKey] = {
                type: createNonNull ? new graphql_1.GraphQLNonNull(type) : type,
                description: exposure.description,
            };
            updateInputFields[exposure.propertyKey] = {
                type,
                description: exposure.description,
            };
        }
    }
    const output = new graphql_1.GraphQLObjectType({ name: typeName, fields: outputFields });
    const createInput = new graphql_1.GraphQLInputObjectType({
        name: `Create${(0, naming_1.upperFirst)(typeName)}Input`,
        fields: createInputFields,
    });
    const updateInput = new graphql_1.GraphQLInputObjectType({
        name: `Update${(0, naming_1.upperFirst)(typeName)}Input`,
        fields: updateInputFields,
    });
    const listResult = new graphql_1.GraphQLObjectType({
        name: `${typeName}ListResult`,
        fields: {
            hits: {
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(output))),
                description: `Matching ${typeName} records.`,
            },
            total: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt), description: 'Total matches.' },
            page: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt), description: 'Current one-based page.' },
        },
    });
    return { model, typeName, output, createInput, updateInput, listResult };
}
//# sourceMappingURL=modelTypes.js.map