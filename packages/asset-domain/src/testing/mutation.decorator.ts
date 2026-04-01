import 'reflect-metadata';

export const MUTATION_METADATA_KEY = Symbol('ocentra:mutation');

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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonEmptyStringArray = (value: readonly string[]): boolean =>
  value.length > 0 && value.every(isNonEmptyString);

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

const toReflectTarget = (target: object): Record<string, unknown> => {
  return target as Record<string, unknown>;
};

const determineTargetType = (target: unknown, propertyKey?: string | symbol): MutationTargetType => {
  if (propertyKey) {
    return 'method';
  }
  if (typeof target === 'function') {
    return 'class';
  }
  return 'function';
};

export function mutation(options: MutationOptions) {
  return function (target: unknown, propertyKey?: string | symbol): void {
    if (!isNonEmptyString(options.reason) || !isNonEmptyStringArray([...options.invariants])) {
      throw new Error('@mutation requires a reason and at least one invariant');
    }

    if (!isObject(target)) {
      throw new Error('@mutation decorator can only be applied to objects or functions');
    }

    const metadata: MutationMetadata = {
      target: determineTargetType(target, propertyKey),
      options,
    };

    const reflectTarget = toReflectTarget(target);
    
    if (propertyKey) {
      Reflect.defineMetadata(MUTATION_METADATA_KEY, metadata, reflectTarget, propertyKey);
      return;
    }

    Reflect.defineMetadata(MUTATION_METADATA_KEY, metadata, reflectTarget);
  };
}

export function getMutationMetadata(target: unknown, propertyKey?: string | symbol): MutationMetadata | undefined {
  if (!isObject(target)) {
    return undefined;
  }

  const reflectTarget = toReflectTarget(target);

  if (propertyKey) {
    return Reflect.getMetadata(MUTATION_METADATA_KEY, reflectTarget, propertyKey) as MutationMetadata | undefined;
  }
  return Reflect.getMetadata(MUTATION_METADATA_KEY, reflectTarget) as MutationMetadata | undefined;
}
