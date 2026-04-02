const isProductionEnvironment = () => {
    const processObject = globalThis.process;
    if (processObject?.env?.NODE_ENV === 'production') {
        return true;
    }
    try {
        const meta = import.meta;
        if (meta.env?.MODE === 'production') {
            return true;
        }
    }
    catch {
        // no import.meta.env
    }
    return false;
};
let runtimeContractsEnabled = !isProductionEnvironment();
const normalizeSpec = (spec) => {
    if (typeof spec === 'string') {
        return { type: spec };
    }
    return spec;
};
const isObjectLike = (value) => (typeof value === 'object' || typeof value === 'function') && value !== null;
export const setRuntimeContractsEnabled = (enabled) => {
    runtimeContractsEnabled = enabled;
};
export const areRuntimeContractsEnabled = () => runtimeContractsEnabled;
export const composeInterfaceSpecs = (...specs) => specs.reduce((accumulator, current) => Object.assign(accumulator, current), {});
export const implementsInterface = (target, spec) => {
    if (!isObjectLike(target)) {
        return false;
    }
    return Object.entries(spec).every(([key, descriptor]) => {
        const { type, optional, predicate } = normalizeSpec(descriptor);
        if (!(key in target)) {
            return Boolean(optional);
        }
        const value = target[key];
        if (value === undefined) {
            return Boolean(optional);
        }
        if (type === 'any') {
            // no-op
        }
        else if (type === 'object') {
            if (typeof value !== 'object' || value === null) {
                return false;
            }
        }
        else if (typeof value !== type) {
            return false;
        }
        if (predicate && !predicate(value)) {
            return false;
        }
        return true;
    });
};
export const assertImplements = (target, name, spec, options) => {
    if (!runtimeContractsEnabled) {
        return;
    }
    if (!isObjectLike(target)) {
        throw new Error(`[${name}] expected object instance, received ${typeof target}`);
    }
    for (const [key, descriptor] of Object.entries(spec)) {
        const { type, optional, predicate } = normalizeSpec(descriptor);
        const hasKey = key in target;
        if (!hasKey) {
            if (optional || options?.allowMissingOptional) {
                continue;
            }
            throw new Error(`[${name}] missing property "${key}"`);
        }
        const value = target[key];
        if (value === undefined) {
            if (optional) {
                continue;
            }
            throw new Error(`[${name}] property "${key}" is undefined`);
        }
        if (type === 'any') {
            // no-op
        }
        else if (type === 'object') {
            if (typeof value !== 'object' || value === null) {
                throw new Error(`[${name}] property "${key}" expected type "object" but received "${typeof value}"`);
            }
        }
        else if (typeof value !== type) {
            throw new Error(`[${name}] property "${key}" expected type "${type}" but received "${typeof value}"`);
        }
        if (predicate && !predicate(value)) {
            throw new Error(`[${name}] property "${key}" failed custom validation`);
        }
    }
};
