import { GraphQLError, GraphQLBoolean, GraphQLFloat, GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, isInputType, isOutputType, } from 'graphql';
import { enforceAuth, forbidden } from './auth';
import { buildModelTypes } from './builders/modelTypes';
import { getArgMetadata, getOpMetadata, isResolverClass } from './metadata';
import { GraphQLDateTime } from './scalars';
import { createMutationName, deleteMutationName, listFieldName, singleFieldName, updateMutationName, } from './naming';
import { PaginationInput, SortInput } from './shared';
const UNSCOPED = null;
function scopeIsEmpty(terms) {
    return terms !== null && terms.every((term) => typeof term !== 'string' || term.trim() === '');
}
function quoteId(id) {
    return `id:"${id.replace(/"/g, '')}"`;
}
async function resolveScope(scope, context, model) {
    if (!scope)
        return UNSCOPED;
    const terms = await scope({ context, model });
    if (terms === null)
        return UNSCOPED;
    if (!Array.isArray(terms) || scopeIsEmpty(terms)) {
        throw forbidden('Scope denied this operation');
    }
    return terms;
}
function withScope(terms, extra) {
    const collected = [...(terms ?? []), ...extra.filter((term) => !!term)];
    return collected.filter((term) => term.trim() !== '');
}
async function loadScoped(model, id, terms) {
    if (terms === null)
        return model.getById(id);
    const result = (await model.findWithTotal(withScope(terms, [quoteId(id)]), {
        limit: 1,
    }));
    return result.hits[0] ?? null;
}
function buildAuthInfo(kind, model, args, context, record) {
    const input = asRecord(args.input);
    return {
        context,
        operation: kind,
        model,
        args,
        input: args.input === undefined ? undefined : input,
        record,
    };
}
function asRecord(value) {
    return value && typeof value === 'object' ? value : {};
}
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
function asNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function buildListField(set, op, scope) {
    return {
        type: new GraphQLNonNull(set.listResult),
        description: `List ${set.typeName} records. Filter with the search string using Elasticsearch query syntax.`,
        args: {
            search: { type: GraphQLString, description: 'Elasticsearch query string.' },
            pagination: { type: PaginationInput, description: 'Page-based pagination.' },
            sort: { type: SortInput, description: 'Sort order.' },
        },
        resolve: async (_source, rawArgs, context) => {
            const args = asRecord(rawArgs);
            const terms = await resolveScope(scope, context, set.model);
            const filterTerms = op.filter
                ? op.filter(buildAuthInfo(op.kind, set.model, args, context)) ?? []
                : [];
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, set.model, args, context));
            }
            const pagination = asRecord(args.pagination);
            const page = Math.max(1, asNumber(pagination.page, 1));
            const limit = Math.min(asNumber(pagination.limit, 1000), 1000);
            const search = asString(args.search);
            const sort = asRecord(args.sort);
            const sortField = asString(sort.field);
            const sortString = sortField
                ? `${sortField}:${sort.direction === 'ASC' ? 'asc' : 'desc'}`
                : undefined;
            const { hits, total } = await set.model.findWithTotal(withScope(terms, [search, ...filterTerms]), { page, limit, sort: sortString });
            return { hits, total, page };
        },
    };
}
function buildGetField(set, op, scope) {
    return {
        type: set.output,
        description: `Fetch one ${set.typeName} by id. Returns null when not found.`,
        args: { id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' } },
        resolve: async (_source, rawArgs, context) => {
            const args = asRecord(rawArgs);
            const id = asString(args.id);
            if (!id)
                return null;
            const terms = await resolveScope(scope, context, set.model);
            const record = await loadScoped(set.model, id, terms);
            if (!record)
                return null;
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, set.model, args, context, record));
            }
            return record;
        },
    };
}
function buildCreateField(set, op, scope) {
    return {
        type: new GraphQLNonNull(set.output),
        description: `Create one ${set.typeName}. Required fields are enforced.`,
        args: {
            input: { type: new GraphQLNonNull(set.createInput), description: `New ${set.typeName}.` },
        },
        resolve: async (_source, rawArgs, context) => {
            const args = asRecord(rawArgs);
            const input = asRecord(args.input);
            const terms = await resolveScope(scope, context, set.model);
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, set.model, args, context));
            }
            const created = await set.model.create(input, { wait: true });
            if (terms !== null) {
                const visible = await loadScoped(set.model, created.id, terms);
                if (!visible) {
                    try {
                        await created.delete();
                    }
                    catch {
                    }
                    throw forbidden(`Scope denied this ${set.typeName} create`);
                }
            }
            return created;
        },
    };
}
function buildUpdateField(set, op, scope) {
    return {
        type: new GraphQLNonNull(set.output),
        description: `Update one ${set.typeName} by id. All input fields are optional.`,
        args: {
            id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' },
            input: { type: new GraphQLNonNull(set.updateInput), description: 'Fields to change.' },
        },
        resolve: async (_source, rawArgs, context) => {
            const args = asRecord(rawArgs);
            const id = asString(args.id);
            if (!id)
                throw new GraphQLError(`${set.typeName} id is required`);
            const terms = await resolveScope(scope, context, set.model);
            const item = (await loadScoped(set.model, id, terms));
            if (!item)
                throw new GraphQLError(`${set.typeName} ${id} not found`);
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, set.model, args, context, item));
            }
            item.update(asRecord(args.input));
            await item.save({ wait: true });
            return item;
        },
    };
}
function buildDeleteField(set, op, scope) {
    return {
        type: new GraphQLNonNull(GraphQLBoolean),
        description: `Delete one ${set.typeName} by id. Returns false when not found.`,
        args: { id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' } },
        resolve: async (_source, rawArgs, context) => {
            const args = asRecord(rawArgs);
            const id = asString(args.id);
            if (!id)
                return false;
            const terms = await resolveScope(scope, context, set.model);
            const item = (await loadScoped(set.model, id, terms));
            if (!item)
                return false;
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, set.model, args, context, item));
            }
            await item.delete();
            return true;
        },
    };
}
function primitiveScalar(value) {
    if (value === String)
        return GraphQLString;
    if (value === Boolean)
        return GraphQLBoolean;
    if (value === Number)
        return GraphQLFloat;
    if (value === Date)
        return GraphQLDateTime;
    return undefined;
}
function isSearchModelClass(value) {
    return (typeof value === 'function' &&
        typeof value.indexName === 'string');
}
function resolveOutputType(value, ensure) {
    const primitive = primitiveScalar(value);
    if (primitive)
        return primitive;
    if (isSearchModelClass(value))
        return ensure(value).output;
    if (value && isOutputType(value))
        return value;
    throw new Error('Custom resolver return type must be a GraphQL output type, a JS primitive, or a search-model class');
}
function resolveInputType(value, ensure) {
    const primitive = primitiveScalar(value);
    if (primitive)
        return primitive;
    if (isSearchModelClass(value))
        return ensure(value).createInput;
    if (value && isInputType(value))
        return value;
    throw new Error('Custom resolver argument type must be a GraphQL input type, a JS primitive, or a search-model class');
}
function buildCustomField(resolver, instance, op, ensure) {
    const argMetadata = getArgMetadata(resolver, op.methodKey);
    const args = {};
    for (const meta of argMetadata) {
        if (meta.isContext || !meta.name || !meta.type)
            continue;
        const type = resolveInputType(meta.type(), ensure);
        args[meta.name] = {
            type: meta.nullable ? type : new GraphQLNonNull(type),
            defaultValue: meta.defaultValue,
            description: meta.description,
        };
    }
    return {
        type: resolveOutputType(op.returnType ? op.returnType() : undefined, ensure),
        args,
        resolve: async (_source, rawArgs, context) => {
            const gqlArgs = asRecord(rawArgs);
            if (op.auth) {
                await enforceAuth(op.auth, buildAuthInfo(op.kind, undefined, gqlArgs, context));
            }
            const positional = [];
            for (const meta of argMetadata) {
                positional[meta.parameterIndex] = meta.isContext ? context : gqlArgs[meta.name ?? ''];
            }
            const fn = instance[op.methodKey];
            if (typeof fn !== 'function') {
                throw new GraphQLError(`${resolver.name}.${op.methodKey} is not a method`);
            }
            return fn.apply(instance, positional);
        },
    };
}
export function buildSchema(options) {
    const registry = new Map();
    const ensure = (model) => {
        const existing = registry.get(model);
        if (existing)
            return existing;
        if (typeof model !== 'function' || typeof model.prototype === 'undefined') {
            throw new Error('Expected a search-model model class');
        }
        const built = buildModelTypes(model);
        registry.set(model, built);
        return built;
    };
    for (const resolver of options.resolvers) {
        for (const op of getOpMetadata(resolver)) {
            if (op.model)
                ensure(op.model);
        }
    }
    const scope = options.scope;
    const queryFields = {};
    const mutationFields = {};
    for (const resolver of options.resolvers) {
        if (!isResolverClass(resolver)) {
            throw new Error(`${resolver.name} must be decorated with @Resolver()`);
        }
        const instance = new resolver();
        for (const op of getOpMetadata(resolver)) {
            switch (op.kind) {
                case 'list': {
                    const set = ensure(op.model);
                    queryFields[listFieldName(set.typeName)] = buildListField(set, op, scope);
                    break;
                }
                case 'get': {
                    const set = ensure(op.model);
                    queryFields[singleFieldName(set.typeName)] = buildGetField(set, op, scope);
                    break;
                }
                case 'create': {
                    const set = ensure(op.model);
                    mutationFields[createMutationName(set.typeName)] = buildCreateField(set, op, scope);
                    break;
                }
                case 'update': {
                    const set = ensure(op.model);
                    mutationFields[updateMutationName(set.typeName)] = buildUpdateField(set, op, scope);
                    break;
                }
                case 'delete': {
                    const set = ensure(op.model);
                    mutationFields[deleteMutationName(set.typeName)] = buildDeleteField(set, op, scope);
                    break;
                }
                case 'query':
                    queryFields[op.methodKey] = buildCustomField(resolver, instance, op, ensure);
                    break;
                case 'mutation':
                    mutationFields[op.methodKey] = buildCustomField(resolver, instance, op, ensure);
                    break;
            }
        }
    }
    if (Object.keys(queryFields).length === 0) {
        throw new Error('buildSchema requires at least one query');
    }
    return new GraphQLSchema({
        query: new GraphQLObjectType({ name: 'Query', fields: queryFields }),
        mutation: Object.keys(mutationFields).length > 0
            ? new GraphQLObjectType({ name: 'Mutation', fields: mutationFields })
            : undefined,
    });
}
//# sourceMappingURL=schema.js.map