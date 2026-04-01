import 'reflect-metadata';
export interface ILogger {
    logWarn(message: string, ...args: unknown[]): void;
    logError(message: string, ...args: unknown[]): void;
}
export declare function setLogger(loggerInstance: ILogger | null): void;
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
export declare function getSerializableConstructors(): WeakSet<SerializableConstructor>;
export declare function serializable(options?: SerializableOptions): (target: unknown, propertyKey?: unknown) => void;
export declare function serializableClass(options?: SerializableClassOptions): <T extends SerializableConstructor | (abstract new (...args: unknown[]) => unknown)>(constructor: T) => T;
export declare function getSerializableClassMetadata<T>(constructor: SerializableConstructor<T>): SerializableClassOptions | undefined;
export declare function getSerializableFields<T>(constructor: SerializableConstructor<T>): SerializableField[];
export declare function required(message?: string): (target: unknown, propertyKey?: unknown) => void;
export declare function getRequiredFields<T>(constructor: SerializableConstructor<T>): RequiredFieldMetadata[];
