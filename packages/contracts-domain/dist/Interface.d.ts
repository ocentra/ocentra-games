export type PrimitiveType = 'string' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'function' | 'object' | 'undefined' | 'any';
export interface PropertySpecObject {
    type: PrimitiveType;
    optional?: boolean;
    predicate?: (value: unknown) => boolean;
}
export type PropertySpec = PrimitiveType | PropertySpecObject;
export type InterfaceSpec = Record<string, PropertySpec>;
export interface AssertOptions {
    allowMissingOptional?: boolean;
}
export declare const setRuntimeContractsEnabled: (enabled: boolean) => void;
export declare const areRuntimeContractsEnabled: () => boolean;
export declare const composeInterfaceSpecs: (...specs: InterfaceSpec[]) => InterfaceSpec;
export declare const implementsInterface: (target: unknown, spec: InterfaceSpec) => boolean;
export declare const assertImplements: (target: unknown, name: string, spec: InterfaceSpec, options?: AssertOptions) => void;
