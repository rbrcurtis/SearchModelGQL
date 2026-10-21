"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forbidden = forbidden;
exports.unauthenticated = unauthenticated;
exports.anyOf = anyOf;
exports.allOf = allOf;
exports.not = not;
exports.enforceAuth = enforceAuth;
const graphql_1 = require("graphql");
function forbidden(message = 'Not authorized for this operation') {
    return new graphql_1.GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}
function unauthenticated(message = 'Authentication required') {
    return new graphql_1.GraphQLError(message, { extensions: { code: 'UNAUTHORIZED' } });
}
function anyOf(...hooks) {
    return async (info) => {
        for (const hook of hooks) {
            if ((await hook(info)) === true)
                return true;
        }
        return false;
    };
}
function allOf(...hooks) {
    return async (info) => {
        for (const hook of hooks) {
            if ((await hook(info)) !== true)
                return false;
        }
        return true;
    };
}
function not(hook) {
    return async (info) => (await hook(info)) !== true;
}
async function enforceAuth(hook, info) {
    const allowed = await hook(info);
    if (allowed !== true)
        throw forbidden();
}
//# sourceMappingURL=auth.js.map