import { type InterfaceSpec } from './Interface';
type AnyConstructor<T extends object = object> = new (...args: any[]) => T;
export declare const Implements: (name: string, spec: InterfaceSpec) => <T extends AnyConstructor>(constructor: T) => T;
export {};
