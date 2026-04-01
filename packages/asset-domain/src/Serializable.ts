import 'reflect-metadata';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetGUID } from '@/AssetGUID';
import { ResourceEntrySerializer } from '@/serialization/ResourceEntrySerializer';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@/resourceEntry/FileResourceEntry';
import { ResourceEntryType } from '@/resourceEntry/types';
import {
  getSerializableClassMetadata,
  getSerializableFields,
  getSerializableConstructors,
  type SerializableConstructor,
  type SerializableField,
} from '@/serialization/decorators';

const log = MainAppLogger.instance;
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
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
} as const;

type SchemaAwareConstructor<T> = SerializableConstructor<T> & {
  schemaVersion?: number;
  migrate?: (data: Record<string, unknown>) => Record<string, unknown>;
};

interface SerializationRuntimeOptions {
  deepClone: boolean;
  freezeResults: boolean;
  freezeInstances: boolean;
}

const runtimeOptions: SerializationRuntimeOptions = {
  deepClone: true,
  freezeResults: true,
  freezeInstances: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSerializableConstructor = (ctor: unknown): ctor is SerializableConstructor =>
  typeof ctor === 'function' && getSerializableConstructors().has(ctor as SerializableConstructor);

const deepClone = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
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
    const copy: Record<string, unknown> = {};
    seen.set(value, copy);
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = deepClone(entry, seen);
    }
    return copy;
  }

  return value;
};

const deepFreeze = (value: unknown, seen = new WeakSet<object>()): unknown => {
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

export const configureSerialization = (
  options: Partial<SerializationRuntimeOptions>
): void => {
  Object.assign(runtimeOptions, options);
};

const serializeValue = (
  value: unknown,
  elementType: SerializableConstructor | undefined,
  visited: WeakSet<object>
): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(entry => {
      if (isRecord(entry)) {
        const resourceEntryType = (entry as { resourceEntryType?: string; resourceType?: string }).resourceEntryType ?? (entry as { resourceType?: string }).resourceType;
        if (resourceEntryType === ResourceEntryType.AssetResourceEntry || resourceEntryType === ResourceEntryType.ImageResourceEntry || resourceEntryType === ResourceEntryType.FileResourceEntry) {
          const cloned = runtimeOptions.deepClone ? (deepClone(entry) as Record<string, unknown>) : { ...entry };
          cloned.resourceEntryType = resourceEntryType;
          return cloned;
        }
      }
      return serializeValue(entry, elementType, visited);
    });
  }

  if (isRecord(value) && 'toArray' in value && typeof (value as { toArray: () => unknown[] }).toArray === 'function') {
    const arrayValue = (value as { toArray: () => unknown[] }).toArray();
    return arrayValue.map(entry =>
      serializeValue(entry, elementType, visited)
    );
  }

  if (isRecord(value)) {
    if (visited.has(value)) {
      throw new Error('Circular reference detected while serializing object graph.');
    }

    const resourceEntryType = (value as { resourceEntryType?: string; resourceType?: string }).resourceEntryType ?? (value as { resourceType?: string }).resourceType;
    if (resourceEntryType === ResourceEntryType.AssetResourceEntry || resourceEntryType === ResourceEntryType.ImageResourceEntry || resourceEntryType === ResourceEntryType.FileResourceEntry) {
      const cloned = runtimeOptions.deepClone ? (deepClone(value) as Record<string, unknown>) : { ...value };
      cloned.resourceEntryType = resourceEntryType;
      return cloned;
    }

    visited.add(value);

    const ctor = (value as { constructor?: SerializableConstructor }).constructor;
    const hasGuid = PROPERTY_NAMES.guid in value && typeof (value as { guid?: unknown }).guid === 'string';

    if (ctor && isSerializableConstructor(ctor)) {
      if (value instanceof ResourceEntry) {
        visited.delete(value);
        return ResourceEntrySerializer.serialize(value);
      }

      if (hasGuid && 'serialize' in value && typeof (value as { serialize?: () => string }).serialize === 'function') {
        const guidValue = (value as { guid: unknown }).guid;
        const guidString = typeof guidValue === 'string' ? guidValue :
          (guidValue && typeof guidValue === 'object' && 'toString' in guidValue && typeof guidValue.toString === 'function' ? guidValue.toString() : '');

        const classMetadata = getSerializableClassMetadata(ctor);
        const assetType = classMetadata?.assetType ?? (ctor as { assetType?: string }).assetType ?? ctor.name;
        const displayName = (value as { displayName?: string }).displayName ?? classMetadata?.displayName ?? (ctor as { displayName?: string }).displayName ?? ctor.name;

        const entry: Record<string, unknown> = {
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

    const cloned = runtimeOptions.deepClone ? (deepClone(value) as Record<string, unknown>) : { ...value };
    visited.delete(value);
    return cloned;
  }

  return value;
};

const serializeInternal = <T>(instance: T, visited: WeakSet<object>): Record<string, unknown> => {
  const ctor = (instance as { constructor: SchemaAwareConstructor<T> }).constructor;
  getSerializableConstructors().add(ctor);
  const source = instance as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  const fields = getSerializableFields(ctor);

  for (const field of fields) {
    const value = source[field.key];
    result[field.key] = serializeValue(value, field.options.elementType, visited);
  }

  if (typeof ctor.schemaVersion === 'number') {
    result[SCHEMA_VERSION_KEY] = ctor.schemaVersion;
  }

  const classMetadata = getSerializableClassMetadata(ctor);
  const ctorName = (ctor as { name?: string }).name;
  const isResourceEntry = ctorName === ResourceEntry.name || ctorName === AssetResourceEntry.name || ctorName === ImageResourceEntry.name || ctorName === FileResourceEntry.name;

  if (classMetadata?.assetType && !isResourceEntry) {
    result.assetType = classMetadata.assetType;
  }

  return runtimeOptions.freezeResults ? (deepFreeze(result) as Record<string, unknown>) : result;
};

export function serialize<T>(instance: T): Record<string, unknown> {
  const visited = new WeakSet<object>();
  return serializeInternal(instance, visited);
}

const deserializeArray = (
  raw: unknown,
  elementType?: SerializableConstructor
): unknown => {
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
          return ResourceEntrySerializer.deserialize(item as Record<string, unknown>);
        }
        if (isSerializableConstructor(elementType)) {
          return deserialize(elementType, item as Record<string, unknown>);
        }
      }

      if (isSerializableConstructor(elementType) && elementTypeName === AssetGUID.name) {
        return AssetGUID.from(item);
      }

      return item;
    });
  }

  return raw.map(item => {
    if (typeof item === 'object' && item !== null && PROPERTY_NAMES._value in item && typeof (item as { _value: unknown })._value === 'string') {
      return (item as { _value: string })._value;
    }
    return item;
  });
};

const deserializeValue = (
  rawValue: unknown,
  field: SerializableField
): unknown => {
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

      return deserialize(elementType, rawValue as Record<string, unknown>);
    }

    const ctor = field.designType as SerializableConstructor | undefined;
    if (ctor) {
      const ctorWithFromJSON = ctor as unknown as { fromJSON?: (json: unknown) => unknown };
      if (typeof ctorWithFromJSON.fromJSON === 'function') {
        return ctorWithFromJSON.fromJSON(rawValue);
      }
    }

    return runtimeOptions.deepClone ? deepClone(rawValue) : { ...rawValue };
  }

  if (field.options.elementType && isSerializableConstructor(field.options.elementType)) {
    const elementTypeName = field.options.elementType.name;
    if (elementTypeName === AssetGUID.name && typeof rawValue === 'string' && rawValue !== null) {
      return AssetGUID.from(rawValue as string);
    }
  }

  if (field.designType && (field.designType as { name?: string }).name === AssetGUID.name && typeof rawValue === 'string' && rawValue !== null) {
    return AssetGUID.from(rawValue as string);
  }

  return rawValue;
};

export function deserialize<T>(
  cls: SerializableConstructor<T>,
  json: Record<string, unknown>
): T {
  const schemaAwareCtor = cls as SchemaAwareConstructor<T>;
  const instance = new cls();
  const target = instance as Record<string, unknown>;

  let raw = runtimeOptions.deepClone ? (deepClone(json) as Record<string, unknown>) : { ...json };
  const incomingVersion = raw[SCHEMA_VERSION_KEY];
  delete raw[SCHEMA_VERSION_KEY];

  const classMetadata = getSerializableClassMetadata(cls);
  const expectedVersion = classMetadata?.schemaVersion ?? schemaAwareCtor.schemaVersion;
  const migrateFn = classMetadata?.migrate ?? schemaAwareCtor.migrate;

  if (typeof expectedVersion === 'number') {
    if (incomingVersion === undefined) {
      logWarn(
        `Missing schema version for ${schemaAwareCtor.name}; expected ${expectedVersion}.`
      );
    } else if (incomingVersion !== expectedVersion) {
      if (typeof migrateFn === 'function') {
        raw = migrateFn({
          ...raw,
          [SCHEMA_VERSION_KEY]: incomingVersion,
        });
      } else {
        logWarn(
          `Schema version mismatch for ${schemaAwareCtor.name}. ` +
          `Found ${incomingVersion}, expected ${expectedVersion}.`
        );
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
    } else if (field.defaultValue !== undefined) {
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
