import 'reflect-metadata';

export interface ILogger {
  logWarn(message: string, ...args: unknown[]): void;
  logError(message: string, ...args: unknown[]): void;
}

let logger: ILogger | null = null;

export function setLogger(loggerInstance: ILogger | null): void {
  logger = loggerInstance;
}

function logWarn(message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean): void {
  if (logger) {
    if (typeof dataOrEnabled === 'boolean') {
      logger.logWarn(message, enabled);
    } else {
      logger.logWarn(message, dataOrEnabled, enabled);
    }
  }
}

const SERIALIZABLE_METADATA_KEY = Symbol('serializableFields');
const SERIALIZABLE_CLASS_METADATA_KEY = Symbol('serializableClass');
const REQUIRED_METADATA_KEY = Symbol('requiredFields');

export type SerializableConstructor<T = unknown> = new () => T;

export interface SerializableOptions {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  group?: string;
  tooltip?: string;
  readonly?: boolean;
  hidden?: boolean;
  inputType?: 'number' | 'angle' | 'string' | 'boolean';
  elementType?: SerializableConstructor;
  dictionaryType?: 'string' | 'number' | 'boolean';
  immutable?: boolean;
}

export interface SerializableClassOptions {
  schemaVersion?: number;
  assetType?: string;
  displayName?: string;
  icon?: string;
  category?: string;
  migrate?: (data: Record<string, unknown>) => Record<string, unknown>;
  allowedChildCategories?: string[];
  parentCategories?: string[];
  sortOrder?: number;
  treeGroup?: string;
}

export interface SerializableField {
  key: string;
  options: SerializableOptions;
  defaultValue: unknown;
  designType?: SerializableConstructor | ArrayConstructor;
}

export interface RequiredFieldMetadata {
  key: string;
  message?: string;
}

const serializableConstructorsInstance = new WeakSet<SerializableConstructor>();

export function getSerializableConstructors(): WeakSet<SerializableConstructor> {
  return serializableConstructorsInstance;
}

const metadataCache = new WeakMap<SerializableConstructor, SerializableField[]>();

export function serializable(options: SerializableOptions = {}): (target: unknown, propertyKey?: unknown) => void {
  return function (
    target: unknown,
    propertyKey?: unknown
  ): void {
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
      logWarn(`@serializable decorator applied to invalid target. Expected object or function, got ${typeof target}`, false);
      return;
    }

    const key = propertyKey !== undefined
      ? (typeof propertyKey === 'string' || typeof propertyKey === 'symbol'
        ? propertyKey
        : ((propertyKey as { name?: string | symbol })?.name as string | symbol | undefined))
      : undefined;

    if (!key) {
      logWarn('@serializable decorator called without a valid property key', false);
      return;
    }

    const stringKey = (typeof key === 'string' ? key : String(key)) as string;
    const constructor = (target as { constructor?: SerializableConstructor }).constructor as SerializableConstructor;
    if (!constructor) {
      logWarn(`@serializable decorator on property '${stringKey}' could not find constructor`, false);
      return;
    }
    getSerializableConstructors().add(constructor);

    const existing =
      (Reflect.getOwnMetadata(
        SERIALIZABLE_METADATA_KEY,
        constructor
      ) as SerializableField[] | undefined) ?? [];

    const fields = [...existing];

    let designType = Reflect.getMetadata('design:type', target as object, key) as
      | SerializableConstructor
      | ArrayConstructor
      | undefined;
    
    if (!designType) {
      designType = Reflect.getOwnMetadata('design:type', target as object, key) as
        | SerializableConstructor
        | ArrayConstructor
        | undefined;
    }

    const fieldData: SerializableField = {
      key: stringKey,
      options,
      defaultValue: (target as Record<string, unknown>)[stringKey],
      designType,
    };

    fields.push(fieldData);

    Reflect.defineMetadata(SERIALIZABLE_METADATA_KEY, fields, constructor);
    metadataCache.delete(constructor);
  };
}

export function serializableClass(options: SerializableClassOptions = {}) {
  return function <T extends SerializableConstructor | (abstract new (...args: unknown[]) => unknown)>(constructor: T): T {
    Reflect.defineMetadata(SERIALIZABLE_CLASS_METADATA_KEY, options, constructor);

    const ctorWithStatics = constructor as SerializableConstructor & {
      schemaVersion?: number;
      assetType?: string;
      displayName?: string;
      icon?: string;
      category?: string;
    };

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

    return constructor as T;
  };
}

export function getSerializableClassMetadata<T>(
  constructor: SerializableConstructor<T>
): SerializableClassOptions | undefined {
  return Reflect.getMetadata(SERIALIZABLE_CLASS_METADATA_KEY, constructor) as SerializableClassOptions | undefined;
}

export function getSerializableFields<T>(
  constructor: SerializableConstructor<T>
): SerializableField[] {
  const cached = metadataCache.get(constructor);
  if (cached) {
    return cached;
  }

  const fields: SerializableField[] = [];
  let currentConstructor: SerializableConstructor | null = constructor;

  while (currentConstructor && currentConstructor !== Object && currentConstructor !== Function) {
    const ownFields = Reflect.getOwnMetadata(
      SERIALIZABLE_METADATA_KEY,
      currentConstructor
    ) as SerializableField[] | undefined;

    if (ownFields) {
      for (const field of ownFields) {
        if (!fields.some(f => f.key === field.key)) {
          fields.push(field);
        }
      }
    }

    currentConstructor = Object.getPrototypeOf(currentConstructor.prototype)?.constructor as SerializableConstructor | null;
  }

  metadataCache.set(constructor, fields);
  return fields;
}

export function required(message?: string): (target: unknown, propertyKey?: unknown) => void {
  return function (
    target: unknown,
    propertyKey?: unknown
  ): void {
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
      logWarn(`@required decorator applied to invalid target`, false);
      return;
    }

    const key = propertyKey !== undefined
      ? (typeof propertyKey === 'string' || typeof propertyKey === 'symbol'
        ? propertyKey
        : ((propertyKey as { name?: string | symbol })?.name as string | symbol | undefined))
      : undefined;

    if (!key) {
      logWarn('@required decorator called without a valid property key', false);
      return;
    }

    const stringKey = typeof key === 'string' ? key : String(key);
    const constructor = (target as { constructor?: SerializableConstructor }).constructor as SerializableConstructor;

    if (!constructor) {
      logWarn(`@required decorator on property '${stringKey}' could not find constructor`, false);
      return;
    }

    const existing = (Reflect.getOwnMetadata(REQUIRED_METADATA_KEY, constructor) as RequiredFieldMetadata[] | undefined) ?? [];

    const fields = [...existing];
    fields.push({ key: stringKey, message });

    Reflect.defineMetadata(REQUIRED_METADATA_KEY, fields, constructor);
  };
}

export function getRequiredFields<T>(
  constructor: SerializableConstructor<T>
): RequiredFieldMetadata[] {
  const fields: RequiredFieldMetadata[] = [];
  let currentConstructor: SerializableConstructor | null = constructor;

  while (currentConstructor && currentConstructor !== Object && currentConstructor !== Function) {
    const ownRequired = Reflect.getOwnMetadata(
      REQUIRED_METADATA_KEY,
      currentConstructor
    ) as RequiredFieldMetadata[] | undefined;

    if (ownRequired) {
      for (const field of ownRequired) {
        if (!fields.some(f => f.key === field.key)) {
          fields.push(field);
        }
      }
    }

    currentConstructor = Object.getPrototypeOf(currentConstructor.prototype)?.constructor as SerializableConstructor | null;
  }

  return fields;
}

