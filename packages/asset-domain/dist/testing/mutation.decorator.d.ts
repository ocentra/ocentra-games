import 'reflect-metadata';
export declare const MUTATION_METADATA_KEY: unique symbol;
export type MutationTargetType = 'function' | 'method' | 'class';
export type MutationOptions = Readonly<{
    reason: string;
    invariants: readonly string[];
    notes?: string;
}>;
export type MutationMetadata = Readonly<{
    target: MutationTargetType;
    options: MutationOptions;
}>;
export declare function mutation(options: MutationOptions): (target: unknown, propertyKey?: string | symbol) => void;
export declare function getMutationMetadata(target: unknown, propertyKey?: string | symbol): MutationMetadata | undefined;
