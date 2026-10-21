import { GraphQLError } from 'graphql';
export function forbidden(message = 'Not authorized for this operation') {
    return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}
export function unauthenticated(message = 'Authentication required') {
    return new GraphQLError(message, { extensions: { code: 'UNAUTHORIZED' } });
}
export function anyOf(...hooks) {
    return async (info) => {
        for (const hook of hooks) {
            if ((await hook(info)) === true)
                return true;
        }
        return false;
    };
}
export function allOf(...hooks) {
    return async (info) => {
        for (const hook of hooks) {
            if ((await hook(info)) !== true)
                return false;
        }
        return true;
    };
}
export function not(hook) {
    return async (info) => (await hook(info)) !== true;
}
export async function enforceAuth(hook, info) {
    const allowed = await hook(info);
    if (allowed !== true)
        throw forbidden();
}
//# sourceMappingURL=auth.js.map