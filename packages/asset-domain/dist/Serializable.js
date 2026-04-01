import 'reflect-metadata';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetGUID } from './AssetGUID.js';
import { ResourceEntrySerializer } from './serialization/ResourceEntrySerializer.js';
import { ResourceEntry } from './resourceEntry/ResourceEntry.js';
import { AssetResourceEntry } from './resourceEntry/AssetResourceEntry.js';
import { ImageResourceEntry } from './resourceEntry/ImageResourceEntry.js';
import { FileResourceEntry } from './resourceEntry/FileResourceEntry.js';
import { ResourceEntryType } from './resourceEntry/types.js';
import { getSerializableClassMetadata, getSerializableFields, getSerializableConstructors, } from './serialization/decorators.js';
const log = MainAppLogger.instance;
const logWarn = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
log.register(import.meta.url);
export const SCHEMA_VERSION_KEY = 'schemaVersion';
const PROPERTY_NAMES = {
    guid: 'guid',
    ref: 'ref',
    type: 'type',
    displayName: 'displayName',
    _value: '_value',
};
const runtimeOptions = {
    deepClone: true,
    freezeResults: true,
    freezeInstances: false,
};
const isRecord = (value) => typeof value === 'object' && value !== null;
const isSerializableConstructor = (ctor) => typeof ctor === 'function' && getSerializableConstructors().has(ctor);
const deepClone = (value, seen = new WeakMap()) => {
    if (Array.isArray(value)) {
        return value.map(item => deepClone(item, seen));
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (isRecord(value)) {
        if (seen.has(value)) {
            return seen.get(value);
        }
        const copy = {};
        seen.set(value, copy);
        for (const [key, entry] of Object.entries(value)) {
            copy[key] = deepClone(entry, seen);
        }
        return copy;
    }
    return value;
};
const deepFreeze = (value, seen = new WeakSet()) => {
    if (Array.isArray(value)) {
        if (!seen.has(value)) {
            seen.add(value);
            value.forEach(item => deepFreeze(item, seen));
        }
        return Object.freeze(value);
    }
    if (isRecord(value)) {
        if (seen.has(value)) {
            return value;
        }
        seen.add(value);
        Object.entries(value).forEach(([, entry]) => {
            deepFreeze(entry, seen);
        });
        return Object.freeze(value);
    }
    return value;
};
export const configureSerialization = (options) => {
    Object.assign(runtimeOptions, options);
};
const serializeValue = (value, elementType, visited) => {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(entry => {
            if (isRecord(entry)) {
                const resourceEntryType = entry.resourceEntryType ?? entry.resourceType;
                if (resourceEntryType === ResourceEntryType.AssetResourceEntry || resourceEntryType === ResourceEntryType.ImageResourceEntry || resourceEntryType === ResourceEntryType.FileResourceEntry) {
                    const cloned = runtimeOptions.deepClone ? deepClone(entry) : { ...entry };
                    cloned.resourceEntryType = resourceEntryType;
                    return cloned;
                }
            }
            return serializeValue(entry, elementType, visited);
        });
    }
    if (isRecord(value) && 'toArray' in value && typeof value.toArray === 'function') {
        const arrayValue = value.toArray();
        return arrayValue.map(entry => serializeValue(entry, elementType, visited));
    }
    if (isRecord(value)) {
        if (visited.has(value)) {
            throw new Error('Circular reference detected while serializing object graph.');
        }
        const resourceEntryType = value.resourceEntryType ?? value.resourceType;
        if (resourceEntryType === ResourceEntryType.AssetResourceEntry || resourceEntryType === ResourceEntryType.ImageResourceEntry || resourceEntryType === ResourceEntryType.FileResourceEntry) {
            const cloned = runtimeOptions.deepClone ? deepClone(value) : { ...value };
            cloned.resourceEntryType = resourceEntryType;
            return cloned;
        }
        visited.add(value);
        const ctor = value.constructor;
        const hasGuid = PROPERTY_NAMES.guid in value && typeof value.guid === 'string';
        if (ctor && isSerializableConstructor(ctor)) {
            if (value instanceof ResourceEntry) {
                visited.delete(value);
                return ResourceEntrySerializer.serialize(value);
            }
            if (hasGuid && 'serialize' in value && typeof value.serialize === 'function') {
                const guidValue = value.guid;
                const guidString = typeof guidValue === 'string' ? guidValue :
                    (guidValue && typeof guidValue === 'object' && 'toString' in guidValue && typeof guidValue.toString === 'function' ? guidValue.toString() : '');
                const classMetadata = getSerializableClassMetadata(ctor);
                const assetType = classMetadata?.assetType ?? ctor.assetType ?? ctor.name;
                const displayName = value.displayName ?? classMetadata?.displayName ?? ctor.displayName ?? ctor.name;
                const entry = {
                    guid: guidString,
                    assetType: assetType,
                    displayName: displayName,
                    path: '',
                    resourceEntryType: ResourceEntryType.AssetResourceEntry,
                };
                visited.delete(value);
                return entry;
            }
            return serializeInternal(value, visited);
        }
        const cloned = runtimeOptions.deepClone ? deepClone(value) : { ...value };
        visited.delete(value);
        return cloned;
    }
    return value;
};
const serializeInternal = (instance, visited) => {
    const ctor = instance.constructor;
    getSerializableConstructors().add(ctor);
    const source = instance;
    const result = {};
    const fields = getSerializableFields(ctor);
    for (const field of fields) {
        const value = source[field.key];
        result[field.key] = serializeValue(value, field.options.elementType, visited);
    }
    if (typeof ctor.schemaVersion === 'number') {
        result[SCHEMA_VERSION_KEY] = ctor.schemaVersion;
    }
    const classMetadata = getSerializableClassMetadata(ctor);
    const ctorName = ctor.name;
    const isResourceEntry = ctorName === ResourceEntry.name || ctorName === AssetResourceEntry.name || ctorName === ImageResourceEntry.name || ctorName === FileResourceEntry.name;
    if (classMetadata?.assetType && !isResourceEntry) {
        result.assetType = classMetadata.assetType;
    }
    return runtimeOptions.freezeResults ? deepFreeze(result) : result;
};
export function serialize(instance) {
    const visited = new WeakSet();
    return serializeInternal(instance, visited);
}
const deserializeArray = (raw, elementType) => {
    if (!Array.isArray(raw)) {
        return raw;
    }
    if (elementType) {
        const elementTypeName = elementType.name;
        const isResourceEntry = elementTypeName === AssetResourceEntry.name ||
            elementTypeName === ImageResourceEntry.name ||
            elementTypeName === FileResourceEntry.name;
        return raw.map(item => {
            if (isRecord(item)) {
                if (isResourceEntry) {
                    return ResourceEntrySerializer.deserialize(item);
                }
                if (isSerializableConstructor(elementType)) {
                    return deserialize(elementType, item);
                }
            }
            if (isSerializableConstructor(elementType) && elementTypeName === AssetGUID.name) {
                return AssetGUID.from(item);
            }
            return item;
        });
    }
    return raw.map(item => {
        if (typeof item === 'object' && item !== null && PROPERTY_NAMES._value in item && typeof item._value === 'string') {
            return item._value;
        }
        return item;
    });
};
const deserializeValue = (rawValue, field) => {
    if (rawValue === undefined) {
        return undefined;
    }
    if (Array.isArray(rawValue)) {
        return deserializeArray(rawValue, field.options.elementType);
    }
    if (isRecord(rawValue)) {
        const resourceEntryType = rawValue.resourceEntryType ?? rawValue.resourceType;
        if (resourceEntryType === ResourceEntryType.AssetResourceEntry || resourceEntryType === ResourceEntryType.ImageResourceEntry || resourceEntryType === ResourceEntryType.FileResourceEntry) {
            return ResourceEntrySerializer.deserialize(rawValue);
        }
        const elementType = field.options.elementType || field.designType;
        if (elementType && isSerializableConstructor(elementType)) {
            const elementTypeName = elementType.name;
            if (elementTypeName === AssetResourceEntry.name) {
                return ResourceEntrySerializer.deserialize(rawValue);
            }
            return deserialize(elementType, rawValue);
        }
        const ctor = field.designType;
        if (ctor) {
            const ctorWithFromJSON = ctor;
            if (typeof ctorWithFromJSON.fromJSON === 'function') {
                return ctorWithFromJSON.fromJSON(rawValue);
            }
        }
        return runtimeOptions.deepClone ? deepClone(rawValue) : { ...rawValue };
    }
    if (field.options.elementType && isSerializableConstructor(field.options.elementType)) {
        const elementTypeName = field.options.elementType.name;
        if (elementTypeName === AssetGUID.name && typeof rawValue === 'string' && rawValue !== null) {
            return AssetGUID.from(rawValue);
        }
    }
    if (field.designType && field.designType.name === AssetGUID.name && typeof rawValue === 'string' && rawValue !== null) {
        return AssetGUID.from(rawValue);
    }
    return rawValue;
};
export function deserialize(cls, json) {
    const schemaAwareCtor = cls;
    const instance = new cls();
    const target = instance;
    let raw = runtimeOptions.deepClone ? deepClone(json) : { ...json };
    const incomingVersion = raw[SCHEMA_VERSION_KEY];
    delete raw[SCHEMA_VERSION_KEY];
    const classMetadata = getSerializableClassMetadata(cls);
    const expectedVersion = classMetadata?.schemaVersion ?? schemaAwareCtor.schemaVersion;
    const migrateFn = classMetadata?.migrate ?? schemaAwareCtor.migrate;
    if (typeof expectedVersion === 'number') {
        if (incomingVersion === undefined) {
            logWarn(`Missing schema version for ${schemaAwareCtor.name}; expected ${expectedVersion}.`);
        }
        else if (incomingVersion !== expectedVersion) {
            if (typeof migrateFn === 'function') {
                raw = migrateFn({
                    ...raw,
                    [SCHEMA_VERSION_KEY]: incomingVersion,
                });
            }
            else {
                logWarn(`Schema version mismatch for ${schemaAwareCtor.name}. ` +
                    `Found ${incomingVersion}, expected ${expectedVersion}.`);
            }
        }
    }
    const fields = getSerializableFields(cls);
    for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(raw, field.key)) {
            const value = deserializeValue(raw[field.key], field);
            if (value !== undefined) {
                target[field.key] = value;
            }
        }
        else if (field.defaultValue !== undefined) {
            target[field.key] =
                runtimeOptions.deepClone && isRecord(field.defaultValue)
                    ? deepClone(field.defaultValue)
                    : field.defaultValue;
        }
    }
    if (runtimeOptions.freezeInstances) {
        deepFreeze(instance);
    }
    return instance;
}
