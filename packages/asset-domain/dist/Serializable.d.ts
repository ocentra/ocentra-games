import 'reflect-metadata';
import { type SerializableConstructor } from './serialization/decorators';
export declare const SCHEMA_VERSION_KEY = "schemaVersion";
interface SerializationRuntimeOptions {
    deepClone: boolean;
    freezeResults: boolean;
    freezeInstances: boolean;
}
export declare const configureSerialization: (options: Partial<SerializationRuntimeOptions>) => void;
export declare function serialize<T>(instance: T): Record<string, unknown>;
export declare function deserialize<T>(cls: SerializableConstructor<T>, json: Record<string, unknown>): T;
export {};
