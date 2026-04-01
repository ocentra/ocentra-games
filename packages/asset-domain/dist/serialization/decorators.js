import 'reflect-metadata';
let logger = null;
export function setLogger(loggerInstance) {
    logger = loggerInstance;
}
function logWarn(message, dataOrEnabled, enabled) {
    if (logger) {
        if (typeof dataOrEnabled === 'boolean') {
            logger.logWarn(message, enabled);
        }
        else {
            logger.logWarn(message, dataOrEnabled, enabled);
        }
    }
}
const SERIALIZABLE_METADATA_KEY = Symbol('serializableFields');
const SERIALIZABLE_CLASS_METADATA_KEY = Symbol('serializableClass');
const REQUIRED_METADATA_KEY = Symbol('requiredFields');
const serializableConstructorsInstance = new WeakSet();
export function getSerializableConstructors() {
    return serializableConstructorsInstance;
}
const metadataCache = new WeakMap();
export function serializable(options = {}) {
    return function (target, propertyKey) {
        if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
            logWarn(`@serializable decorator applied to invalid target. Expected object or function, got ${typeof target}`, false);
            return;
        }
        const key = propertyKey !== undefined
            ? (typeof propertyKey === 'string' || typeof propertyKey === 'symbol'
                ? propertyKey
                : propertyKey?.name)
            : undefined;
        if (!key) {
            logWarn('@serializable decorator called without a valid property key', false);
            return;
        }
        const stringKey = (typeof key === 'string' ? key : String(key));
        const constructor = target.constructor;
        if (!constructor) {
            logWarn(`@serializable decorator on property '${stringKey}' could not find constructor`, false);
            return;
        }
        getSerializableConstructors().add(constructor);
        const existing = Reflect.getOwnMetadata(SERIALIZABLE_METADATA_KEY, constructor) ?? [];
        const fields = [...existing];
        let designType = Reflect.getMetadata('design:type', target, key);
        if (!designType) {
            designType = Reflect.getOwnMetadata('design:type', target, key);
        }
        const fieldData = {
            key: stringKey,
            options,
            defaultValue: target[stringKey],
            designType,
        };
        fields.push(fieldData);
        Reflect.defineMetadata(SERIALIZABLE_METADATA_KEY, fields, constructor);
        metadataCache.delete(constructor);
    };
}
export function serializableClass(options = {}) {
    return function (constructor) {
        Reflect.defineMetadata(SERIALIZABLE_CLASS_METADATA_KEY, options, constructor);
        const ctorWithStatics = constructor;
        if (options.schemaVersion !== undefined) {
            ctorWithStatics.schemaVersion = options.schemaVersion;
        }
        if (options.assetType) {
            ctorWithStatics.assetType = options.assetType;
        }
        if (options.displayName) {
            ctorWithStatics.displayName = options.displayName;
        }
        if (options.icon) {
            ctorWithStatics.icon = options.icon;
        }
        if (options.category) {
            ctorWithStatics.category = options.category;
        }
        return constructor;
    };
}
export function getSerializableClassMetadata(constructor) {
    return Reflect.getMetadata(SERIALIZABLE_CLASS_METADATA_KEY, constructor);
}
export function getSerializableFields(constructor) {
    const cached = metadataCache.get(constructor);
    if (cached) {
        return cached;
    }
    const fields = [];
    let currentConstructor = constructor;
    while (currentConstructor && currentConstructor !== Object && currentConstructor !== Function) {
        const ownFields = Reflect.getOwnMetadata(SERIALIZABLE_METADATA_KEY, currentConstructor);
        if (ownFields) {
            for (const field of ownFields) {
                if (!fields.some(f => f.key === field.key)) {
                    fields.push(field);
                }
            }
        }
        currentConstructor = Object.getPrototypeOf(currentConstructor.prototype)?.constructor;
    }
    metadataCache.set(constructor, fields);
    return fields;
}
export function required(message) {
    return function (target, propertyKey) {
        if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
            logWarn(`@required decorator applied to invalid target`, false);
            return;
        }
        const key = propertyKey !== undefined
            ? (typeof propertyKey === 'string' || typeof propertyKey === 'symbol'
                ? propertyKey
                : propertyKey?.name)
            : undefined;
        if (!key) {
            logWarn('@required decorator called without a valid property key', false);
            return;
        }
        const stringKey = typeof key === 'string' ? key : String(key);
        const constructor = target.constructor;
        if (!constructor) {
            logWarn(`@required decorator on property '${stringKey}' could not find constructor`, false);
            return;
        }
        const existing = Reflect.getOwnMetadata(REQUIRED_METADATA_KEY, constructor) ?? [];
        const fields = [...existing];
        fields.push({ key: stringKey, message });
        Reflect.defineMetadata(REQUIRED_METADATA_KEY, fields, constructor);
    };
}
export function getRequiredFields(constructor) {
    const fields = [];
    let currentConstructor = constructor;
    while (currentConstructor && currentConstructor !== Object && currentConstructor !== Function) {
        const ownRequired = Reflect.getOwnMetadata(REQUIRED_METADATA_KEY, currentConstructor);
        if (ownRequired) {
            for (const field of ownRequired) {
                if (!fields.some(f => f.key === field.key)) {
                    fields.push(field);
                }
            }
        }
        currentConstructor = Object.getPrototypeOf(currentConstructor.prototype)?.constructor;
    }
    return fields;
}
