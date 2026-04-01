import 'reflect-metadata';
export const MUTATION_METADATA_KEY = Symbol('ocentra:mutation');
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyStringArray = (value) => value.length > 0 && value.every(isNonEmptyString);
const isObject = (value) => typeof value === 'object' && value !== null;
const toReflectTarget = (target) => {
    return target;
};
const determineTargetType = (target, propertyKey) => {
    if (propertyKey) {
        return 'method';
    }
    if (typeof target === 'function') {
        return 'class';
    }
    return 'function';
};
export function mutation(options) {
    return function (target, propertyKey) {
        if (!isNonEmptyString(options.reason) || !isNonEmptyStringArray([...options.invariants])) {
            throw new Error('@mutation requires a reason and at least one invariant');
        }
        if (!isObject(target)) {
            throw new Error('@mutation decorator can only be applied to objects or functions');
        }
        const metadata = {
            target: determineTargetType(target, propertyKey),
            options,
        };
        const reflectTarget = toReflectTarget(target);
        if (propertyKey) {
            Reflect.defineMetadata(MUTATION_METADATA_KEY, metadata, reflectTarget, propertyKey);
            return;
        }
        Reflect.defineMetadata(MUTATION_METADATA_KEY, metadata, reflectTarget);
    };
}
export function getMutationMetadata(target, propertyKey) {
    if (!isObject(target)) {
        return undefined;
    }
    const reflectTarget = toReflectTarget(target);
    if (propertyKey) {
        return Reflect.getMetadata(MUTATION_METADATA_KEY, reflectTarget, propertyKey);
    }
    return Reflect.getMetadata(MUTATION_METADATA_KEY, reflectTarget);
}
