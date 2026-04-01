import type { ScriptableObject } from '../ScriptableObject';
interface ScriptableObjectRegistration {
    constructor: new () => ScriptableObject;
    executionOrder: number;
    getOrCreateInstance: () => Promise<ScriptableObject>;
}
export declare class ScriptableObjectRegistry {
    private static registrations;
    static register(constructor: new () => ScriptableObject, getOrCreateInstance: () => Promise<ScriptableObject>): void;
    static getRegistrations(): readonly ScriptableObjectRegistration[];
    static initializeAll(): Promise<void>;
}
export {};
