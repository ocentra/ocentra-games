import * as Schema from 'effect/Schema';

export type SchemaPath = Array<string | number>;

export interface SchemaIssue {
  code?: string;
  path: SchemaPath;
  message: string;
}

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: SchemaError };

export class SchemaError extends Error {
  readonly issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    super(issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '));
    this.name = 'SchemaError';
    this.issues = issues;
  }

  format(): Record<string, unknown> {
    return { _errors: this.issues.map((issue) => issue.message) };
  }

  flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] } {
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];
    for (const issue of this.issues) {
      const key = issue.path.join('.');
      if (key.length === 0) {
        formErrors.push(issue.message);
      } else {
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
    }
    return { fieldErrors, formErrors };
  }
}

export const IssueCode = {
  custom: 'custom',
} as const;

type Parser<T> = (input: unknown, path: SchemaPath) => T;
type Refinement<T> = (value: T) => unknown;
type RefinementOptionObject = { readonly message?: unknown; readonly path?: SchemaPath; readonly [key: string]: unknown };
type RefinementOptions<T> = string | RefinementOptionObject | ((value: T) => string | RefinementOptionObject);
type SuperRefinement<T> = (value: T, context: SuperRefinementContext) => void;
type AnyEffectSchema = EffectSchema<any>;

export interface SuperRefinementContext {
  addIssue(issue: { readonly code?: string; readonly path?: SchemaPath; readonly message: string }): void;
}

type Brand<K extends string> = { readonly __brand: K };
type InferShape<S extends Record<string, AnyEffectSchema>> = {
  [K in keyof S as undefined extends schema.infer<S[K]> ? never : K]: schema.infer<S[K]>;
} & {
  [K in keyof S as undefined extends schema.infer<S[K]> ? K : never]?: Exclude<schema.infer<S[K]>, undefined>;
};

function issue(path: SchemaPath, message: string, code: string = IssueCode.custom): SchemaError {
  return new SchemaError([{ code, path, message }]);
}

function toSchemaError(error: unknown): SchemaError {
  if (error instanceof SchemaError) {
    return error;
  }
  if (error instanceof Error) {
    return new SchemaError([{ code: IssueCode.custom, path: [], message: error.message }]);
  }
  return new SchemaError([{ code: IssueCode.custom, path: [], message: String(error) }]);
}

function messageFrom(options: unknown, fallback: string): string {
  if (typeof options === 'string') {
    return options;
  }
  if (options && typeof options === 'object' && 'message' in options) {
    const message = (options as { readonly message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

function issueFromRefinement<T>(options: RefinementOptions<T> | undefined, value: T, path: SchemaPath, fallback: string): SchemaError {
  const resolved = typeof options === 'function' ? (options as (value: T) => unknown)(value) : options;
  const localPath = resolved && typeof resolved === 'object' && 'path' in resolved
    ? (resolved as { readonly path?: SchemaPath }).path ?? []
    : [];
  return issue([...path, ...localPath], messageFrom(resolved, fallback));
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function parseWithEffect<T>(effectSchema: Schema.Schema<T>, input: unknown, path: SchemaPath, fallback: string): T {
  try {
    return Schema.decodeUnknownSync(effectSchema)(input);
  } catch {
    throw issue(path, fallback);
  }
}

export class EffectSchema<T> {
  readonly _type!: T;
  readonly effectSchema?: Schema.Schema.Any;
  private readonly parseInternal: Parser<T>;
  private readonly optionalField: boolean;

  constructor(parseInternal: Parser<T>, effectSchema?: Schema.Schema.Any, optionalField = false) {
    this.parseInternal = parseInternal;
    this.effectSchema = effectSchema;
    this.optionalField = optionalField;
  }

  parse(input: unknown): T {
    return this.parseAt(input, []);
  }

  safeParse(input: unknown): SafeParseResult<T> {
    try {
      return { success: true, data: this.parse(input) };
    } catch (error) {
      return { success: false, error: toSchemaError(error) };
    }
  }

  parseAt(input: unknown, path: SchemaPath): T {
    return this.parseInternal(input, path);
  }

  isOptional(): boolean {
    return this.optionalField;
  }

  optional(): EffectSchema<T | undefined> {
    return new EffectSchema<T | undefined>(
      (input, path) => input === undefined ? undefined : this.parseAt(input, path),
      undefined,
      true,
    );
  }

  nullable(): EffectSchema<T | null> {
    return new EffectSchema<T | null>((input, path) => input === null ? null : this.parseAt(input, path));
  }

  nullish(): EffectSchema<T | null | undefined> {
    return new EffectSchema<T | null | undefined>(
      (input, path) => input === null || input === undefined ? input : this.parseAt(input, path),
      undefined,
      true,
    );
  }

  default(value: unknown | (() => unknown)): EffectSchema<Exclude<T, undefined>> {
    return new EffectSchema<Exclude<T, undefined>>((input, path) => {
      if (input === undefined) {
        const defaultInput = typeof value === 'function' ? (value as () => unknown)() : value;
        return this.parseAt(defaultInput, path) as Exclude<T, undefined>;
      }
      return this.parseAt(input, path) as Exclude<T, undefined>;
    });
  }

  refine(predicate: Refinement<T>, options?: RefinementOptions<T>): EffectSchema<T> {
    return new EffectSchema<T>((input, path) => {
      const value = this.parseAt(input, path);
      if (!predicate(value)) {
        throw issueFromRefinement(options, value, path, 'Invalid input');
      }
      return value;
    }, this.effectSchema);
  }

  superRefine(refinement: SuperRefinement<T>): EffectSchema<T> {
    return new EffectSchema<T>((input, path) => {
      const value = this.parseAt(input, path);
      const issues: SchemaIssue[] = [];
      refinement(value, {
        addIssue(localIssue) {
          issues.push({
            code: localIssue.code ?? IssueCode.custom,
            path: [...path, ...(localIssue.path ?? [])],
            message: localIssue.message,
          });
        },
      });
      if (issues.length > 0) {
        throw new SchemaError(issues);
      }
      return value;
    }, this.effectSchema);
  }

  transform<U>(mapper: (value: T) => U): EffectSchema<U> {
    return new EffectSchema<U>((input, path) => mapper(this.parseAt(input, path)));
  }

  array(): ArraySchema<T> {
    return new ArraySchema(this);
  }

  or<U>(other: EffectSchema<U>): EffectSchema<T | U> {
    return union([this, other]);
  }

  and<U>(other: EffectSchema<U>): EffectSchema<T & U> {
    return new EffectSchema<T & U>((input, path) => {
      const left = this.parseAt(input, path);
      const right = other.parseAt(input, path);
      if (isPlainRecord(left) && isPlainRecord(right)) {
        return { ...left, ...right } as T & U;
      }
      return right as T & U;
    });
  }

  brand<K extends string>(): EffectSchema<T & Brand<K>> {
    return this as unknown as EffectSchema<T & Brand<K>>;
  }
}

export class StringSchema extends EffectSchema<string> {
  constructor(parseInternal?: Parser<string>) {
    super(parseInternal ?? ((input, path) => parseWithEffect(Schema.String, input, path, 'Expected string')), Schema.String);
  }

  min(length: number, options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (value.length < length) {
        throw issue(path, messageFrom(options, `Expected string at least ${length} character(s) long`));
      }
      return value;
    });
  }

  max(length: number, options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (value.length > length) {
        throw issue(path, messageFrom(options, `Expected string at most ${length} character(s) long`));
      }
      return value;
    });
  }

  length(length: number, options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (value.length !== length) {
        throw issue(path, messageFrom(options, `Expected string exactly ${length} character(s) long`));
      }
      return value;
    });
  }

  regex(pattern: RegExp, options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (!pattern.test(value)) {
        throw issue(path, messageFrom(options, 'Invalid string'));
      }
      return value;
    });
  }

  uuid(options?: unknown): StringSchema {
    return this.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, options ?? 'Invalid UUID');
  }

  datetime(options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (!Number.isFinite(Date.parse(value))) {
        throw issue(path, messageFrom(options, 'Invalid date-time string'));
      }
      return value;
    });
  }

  url(options?: unknown): StringSchema {
    return new StringSchema((input, path) => {
      const value = this.parseAt(input, path);
      try {
        new URL(value);
        return value;
      } catch {
        throw issue(path, messageFrom(options, 'Invalid URL'));
      }
    });
  }

  trim(): StringSchema {
    return new StringSchema((input, path) => this.parseAt(input, path).trim());
  }
}

export class NumberSchema extends EffectSchema<number> {
  constructor(parseInternal?: Parser<number>) {
    super(parseInternal ?? ((input, path) => parseWithEffect(Schema.Number, input, path, 'Expected number')), Schema.Number);
  }

  int(options?: unknown): NumberSchema {
    return new NumberSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (!Number.isInteger(value)) {
        throw issue(path, messageFrom(options, 'Expected integer'));
      }
      return value;
    });
  }

  finite(options?: unknown): NumberSchema {
    return new NumberSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (!Number.isFinite(value)) {
        throw issue(path, messageFrom(options, 'Expected finite number'));
      }
      return value;
    });
  }

  positive(options?: unknown): NumberSchema {
    return this.min(Number.MIN_VALUE, options ?? 'Expected positive number');
  }

  nonnegative(options?: unknown): NumberSchema {
    return this.min(0, options ?? 'Expected nonnegative number');
  }

  min(minimum: number, options?: unknown): NumberSchema {
    return new NumberSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (value < minimum) {
        throw issue(path, messageFrom(options, `Expected number greater than or equal to ${minimum}`));
      }
      return value;
    });
  }

  max(maximum: number, options?: unknown): NumberSchema {
    return new NumberSchema((input, path) => {
      const value = this.parseAt(input, path);
      if (value > maximum) {
        throw issue(path, messageFrom(options, `Expected number less than or equal to ${maximum}`));
      }
      return value;
    });
  }
}

export class ArraySchema<T> extends EffectSchema<T[]> {
  constructor(private readonly itemSchema: EffectSchema<T>, parseInternal?: Parser<T[]>) {
    super(parseInternal ?? ((input, path) => {
      if (!Array.isArray(input)) {
        throw issue(path, 'Expected array');
      }
      return input.map((item, index) => itemSchema.parseAt(item, [...path, index]));
    }));
  }

  min(length: number, options?: unknown): ArraySchema<T> {
    return new ArraySchema(this.itemSchema, (input, path) => {
      const value = this.parseAt(input, path);
      if (value.length < length) {
        throw issue(path, messageFrom(options, `Expected array with at least ${length} item(s)`));
      }
      return value;
    });
  }

  max(length: number, options?: unknown): ArraySchema<T> {
    return new ArraySchema(this.itemSchema, (input, path) => {
      const value = this.parseAt(input, path);
      if (value.length > length) {
        throw issue(path, messageFrom(options, `Expected array with at most ${length} item(s)`));
      }
      return value;
    });
  }
}

type UnknownKeysMode = 'strip' | 'strict' | 'passthrough';

export class ObjectSchema<S extends Record<string, AnyEffectSchema>> extends EffectSchema<InferShape<S>> {
  readonly shape: S;
  private readonly unknownKeysMode: UnknownKeysMode;

  constructor(shape: S, unknownKeysMode: UnknownKeysMode = 'strip') {
    super((input, path) => {
      if (!isPlainRecord(input)) {
        throw issue(path, 'Expected object');
      }
      const output: Record<string, unknown> = unknownKeysMode === 'passthrough' ? { ...input } : {};
      const knownKeys = new Set(Object.keys(shape));
      if (unknownKeysMode === 'strict') {
        for (const key of Object.keys(input)) {
          if (!knownKeys.has(key)) {
            throw issue([...path, key], 'Unknown key');
          }
        }
      }
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const value = fieldSchema.parseAt(input[key], [...path, key]);
        if (value !== undefined || Object.prototype.hasOwnProperty.call(input, key)) {
          output[key] = value;
        }
      }
      return output as InferShape<S>;
    });
    this.shape = shape;
    this.unknownKeysMode = unknownKeysMode;
  }

  extend<E extends Record<string, AnyEffectSchema>>(extraShape: E): ObjectSchema<S & E> {
    return new ObjectSchema({ ...this.shape, ...extraShape } as S & E, this.unknownKeysMode);
  }

  strict(): ObjectSchema<S> {
    return new ObjectSchema(this.shape, 'strict');
  }

  passthrough(): ObjectSchema<S> {
    return new ObjectSchema(this.shape, 'passthrough');
  }

  partial(): ObjectSchema<{ [K in keyof S]: EffectSchema<schema.infer<S[K]> | undefined> }> {
    const next: Record<string, AnyEffectSchema> = {};
    for (const [key, fieldSchema] of Object.entries(this.shape)) {
      next[key] = fieldSchema.optional();
    }
    return new ObjectSchema(next as { [K in keyof S]: EffectSchema<schema.infer<S[K]> | undefined> }, this.unknownKeysMode);
  }
}

function literal<T extends string | number | boolean | null>(expected: T): EffectSchema<T> {
  return new EffectSchema<T>((input, path) => {
    if (input !== expected) {
      throw issue(path, `Expected ${String(expected)}`);
    }
    return expected;
  }, Schema.Literal(expected) as Schema.Schema<T>);
}

function enumSchema<const Values extends readonly [string, ...string[]] | readonly string[]>(values: Values, _options?: unknown): EffectSchema<Values[number]> {
  const allowed = new Set<string>(values as readonly string[]);
  return new EffectSchema<Values[number]>((input, path) => {
    if (typeof input !== 'string' || !allowed.has(input)) {
      throw issue(path, `Expected one of: ${[...allowed].join(', ')}`);
    }
    return input as Values[number];
  }, Schema.Literal(...(values as readonly [string, ...string[]])) as Schema.Schema<Values[number]>);
}

function union<const Members extends readonly AnyEffectSchema[]>(members: Members, options?: unknown): EffectSchema<schema.infer<Members[number]>> {
  return new EffectSchema<schema.infer<Members[number]>>((input, path) => {
    const allIssues: SchemaIssue[] = [];
    for (const member of members) {
      const result = member.safeParse(input);
      if (result.success) {
        return result.data as schema.infer<Members[number]>;
      }
      allIssues.push(...result.error.issues);
    }
    throw new SchemaError([{
      code: IssueCode.custom,
      path,
      message: messageFrom(options && typeof options === 'object' && 'errorMap' in options
        ? (options as { readonly errorMap?: () => { readonly message?: string } }).errorMap?.()
        : options, 'Invalid union'),
    }]);
  });
}

function record<Value>(valueSchema: EffectSchema<Value>): EffectSchema<Record<string, Value>>;
function record<Key extends string, Value>(keySchema: EffectSchema<Key>, valueSchema: EffectSchema<Value>): EffectSchema<Record<Key, Value>>;
function record<Key extends string, Value>(
  keyOrValueSchema: EffectSchema<Key> | EffectSchema<Value>,
  maybeValueSchema?: EffectSchema<Value>,
): EffectSchema<Record<string, Value>> {
  const keySchema = maybeValueSchema ? keyOrValueSchema as EffectSchema<Key> : new StringSchema() as unknown as EffectSchema<Key>;
  const valueSchema = maybeValueSchema ?? keyOrValueSchema as EffectSchema<Value>;
  return new EffectSchema<Record<string, Value>>((input, path) => {
    if (!isPlainRecord(input)) {
      throw issue(path, 'Expected object record');
    }
    const output: Record<string, Value> = {};
    for (const [key, value] of Object.entries(input)) {
      const parsedKey = keySchema.parseAt(key, [...path, key]);
      output[String(parsedKey)] = valueSchema.parseAt(value, [...path, key]);
    }
    return output;
  });
}

function coerceNumber(): NumberSchema {
  return new NumberSchema((input, path) => {
    if (typeof input === 'number') {
      return parseWithEffect(Schema.Number, input, path, 'Expected number');
    }
    if (typeof input === 'string' && input.trim().length > 0) {
      const value = Number(input);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    throw issue(path, 'Expected number');
  });
}

function nativeEnum<T extends Record<string, string | number>>(value: T, _options?: unknown): EffectSchema<T[keyof T]> {
  const values = Object.values(value).filter((entry): entry is T[keyof T] => typeof entry === 'string' || typeof entry === 'number');
  return new EffectSchema<T[keyof T]>((input, path) => {
    if (!values.includes(input as T[keyof T])) {
      throw issue(path, `Expected one of: ${values.join(', ')}`);
    }
    return input as T[keyof T];
  });
}

export const schema = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new EffectSchema<boolean>((input, path) => parseWithEffect(Schema.Boolean, input, path, 'Expected boolean'), Schema.Boolean),
  unknown: () => new EffectSchema<unknown>((input) => input, Schema.Unknown),
  any: () => new EffectSchema<unknown>((input) => input, Schema.Unknown),
  null: () => literal(null),
  literal,
  enum: enumSchema,
  nativeEnum,
  array: <T>(itemSchema: EffectSchema<T>) => new ArraySchema(itemSchema),
  object: <S extends Record<string, AnyEffectSchema>>(shape: S) => new ObjectSchema(shape),
  record,
  union,
  discriminatedUnion: <const Members extends readonly AnyEffectSchema[]>(_key: string, members: Members) => union(members),
  coerce: {
    number: coerceNumber,
  },
  IssueCode,
  SchemaError,
};

export namespace schema {
  export type infer<T> = T extends EffectSchema<infer Output> ? Output : never;
  export type output<T> = T extends EffectSchema<infer Output> ? Output : never;
  export type SchemaType<T = unknown> = EffectSchema<T>;
  export type SchemaTypeAny = EffectSchema<unknown>;
}
