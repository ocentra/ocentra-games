export type PrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'function'
  | 'object'
  | 'undefined'
  | 'any';

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

const isProductionEnvironment = (): boolean => {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const p = g && (g as { process?: { env?: { NODE_ENV?: string } } }).process;
    if (p?.env?.NODE_ENV === 'production') return true;
  } catch {
    /* ignore */
  }
  try {
    const meta = import.meta as { env?: { MODE?: string } };
    if (meta.env?.MODE === 'production') return true;
  } catch {
    return false;
  }
  return false;
};

let runtimeContractsEnabled = !isProductionEnvironment();

const normalizeSpec = (spec: PropertySpec): PropertySpecObject => {
  if (typeof spec === 'string') {
    return { type: spec };
  }
  return spec;
};

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

/**
 * Enables or disables runtime contract enforcement. Contracts are enabled by default in
 * non-production environments and disabled in production builds.
 */
export const setRuntimeContractsEnabled = (enabled: boolean): void => {
  runtimeContractsEnabled = enabled;
};

/**
 * Indicates whether runtime contract validation is currently enabled.
 */
export const areRuntimeContractsEnabled = (): boolean => runtimeContractsEnabled;

/**
 * Composes multiple interface specifications into a single aggregated spec.
 * Later specs take precedence on overlapping property keys.
 */
export const composeInterfaceSpecs = (
  ...specs: InterfaceSpec[]
): InterfaceSpec =>
  specs.reduce<InterfaceSpec>((accumulator, current) => Object.assign(accumulator, current), {});

export const implementsInterface = (
  target: unknown,
  spec: InterfaceSpec
): boolean => {
  if (!isObjectLike(target)) {
    return false;
  }

  return Object.entries(spec).every(([key, descriptor]) => {
    const { type, optional, predicate } = normalizeSpec(descriptor);

    if (!(key in (target as Record<string, unknown>))) {
      return Boolean(optional);
    }

    const value = (target as Record<string, unknown>)[key];

    if (value === undefined) {
      return Boolean(optional);
    }

    if (type === 'any') {
      // no-op
    } else if (type === 'object') {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
    } else if (typeof value !== type) {
      return false;
    }

    if (predicate && !predicate(value)) {
      return false;
    }

    return true;
  });
};

export const assertImplements = (
  target: unknown,
  name: string,
  spec: InterfaceSpec,
  options?: AssertOptions
): void => {
  if (!runtimeContractsEnabled) {
    return;
  }

  if (!isObjectLike(target)) {
    throw new Error(`[${name}] expected object instance, received ${typeof target}`);
  }

  for (const [key, descriptor] of Object.entries(spec)) {
    const { type, optional, predicate } = normalizeSpec(descriptor);
    const hasKey = key in target;

    if (!hasKey) {
      if (optional || options?.allowMissingOptional) {
        continue;
      }
      throw new Error(`[${name}] missing property "${key}"`);
    }

    const value = (target as Record<string, unknown>)[key];

    if (value === undefined) {
      if (optional) {
        continue;
      }
      throw new Error(`[${name}] property "${key}" is undefined`);
    }

    if (type === 'any') {
      // no-op
    } else if (type === 'object') {
      if (typeof value !== 'object' || value === null) {
        throw new Error(
          `[${name}] property "${key}" expected type "object" but received "${typeof value}"`
        );
      }
    } else if (typeof value !== type) {
      throw new Error(
        `[${name}] property "${key}" expected type "${type}" but received "${typeof value}"`
      );
    }

    if (predicate && !predicate(value)) {
      throw new Error(`[${name}] property "${key}" failed custom validation`);
    }
  }
};
