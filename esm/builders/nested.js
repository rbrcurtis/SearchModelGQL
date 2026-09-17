import { GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, } from 'graphql';
import { leafInputType, leafOutputType } from '../infer';
import { upperFirst } from '../naming';
function outputTypeForProperty(parentName, key, property) {
    if (property.type === 'object' && property.options?.properties) {
        return buildNestedOutputType(`${parentName}${upperFirst(key)}`, property.options.properties);
    }
    if (property.type === 'objectArray' && property.options?.properties) {
        return new GraphQLList(new GraphQLNonNull(buildNestedOutputType(`${parentName}${upperFirst(key)}`, property.options.properties)));
    }
    const leaf = leafOutputType(property.type);
    if (!leaf) {
        throw new Error(`Unsupported nested output field type: ${property.type}`);
    }
    return leaf;
}
export function buildNestedOutputType(name, properties) {
    return new GraphQLObjectType({
        name,
        fields: () => {
            const fields = {};
            for (const [key, property] of Object.entries(properties)) {
                const type = outputTypeForProperty(name, key, property);
                fields[key] = {
                    type: property.options?.required ? new GraphQLNonNull(type) : type,
                };
            }
            return fields;
        },
    });
}
function inputTypeForProperty(parentName, key, property) {
    if (property.type === 'object' && property.options?.properties) {
        return buildNestedInputType(`${parentName}${upperFirst(key)}Input`, property.options.properties);
    }
    if (property.type === 'objectArray' && property.options?.properties) {
        return new GraphQLList(new GraphQLNonNull(buildNestedInputType(`${parentName}${upperFirst(key)}Input`, property.options.properties)));
    }
    const leaf = leafInputType(property.type);
    if (!leaf) {
        throw new Error(`Unsupported nested input field type: ${property.type}`);
    }
    return leaf;
}
export function buildNestedInputType(name, properties) {
    return new GraphQLInputObjectType({
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