import * as Either from 'effect/Either';
import * as ParseResult from 'effect/ParseResult';
import * as Schema from 'effect/Schema';

export { Schema };

export type SchemaPath = Array<string | number>;

export interface SchemaIssue {
  readonly code?: string;
  readonly path: SchemaPath;
  readonly message: string;
}

export type SafeParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: SchemaDecodeError };

export type Infer<S extends Schema.Schema.AnyNoContext> = Schema.Schema.Type<S>;

export interface ParsedSchema<S extends Schema.Schema.AnyNoContext> extends Schema.Schema<Schema.Schema.Type<S>, Schema.Schema.Encoded<S>, never> {
  parse(input: unknown): Schema.Schema.Type<S>;
  safeParse(input: unknown): SafeParseResult<Schema.Schema.Type<S>>;
  partial(): ParsedSchema<Schema.Schema<Partial<Schema.Schema.Type<S>>, Partial<Schema.Schema.Encoded<S>>, never>>;
}

export class SchemaDecodeError extends Error {
  readonly issues: SchemaIssue[];

  constructor(issues: readonly SchemaIssue[]) {
    super(issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; '));
    this.name = 'SchemaDecodeError';
    this.issues = [...issues];
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

function normalizePath(path: readonly PropertyKey[]): SchemaPath {
  return path.map((part) => typeof part === 'number' ? part : String(part));
}

function toDecodeError(error: ParseResult.ParseError): SchemaDecodeError {
  const issues = ParseResult.ArrayFormatter.formatErrorSync(error).map((issue) => ({
    code: issue._tag,
    path: normalizePath(issue.path),
    message: issue.message,
  }));
  return new SchemaDecodeError(issues);
}

export function safeParseUnknown<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  input: unknown,
): SafeParseResult<Schema.Schema.Type<S>> {
  const decoded = Schema.decodeUnknownEither(schema)(input, { errors: 'all' });
  if (Either.isRight(decoded)) {
    return { success: true, data: decoded.right };
  }
  return { success: false, error: toDecodeError(decoded.left) };
}

export function parseUnknown<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  input: unknown,
): Schema.Schema.Type<S> {
  const parsed = safeParseUnknown(schema, input);
  if (parsed.success) {
    return parsed.data;
  }
  throw parsed.error;
}

export function withParser<S extends Schema.Schema.AnyNoContext>(schema: S): ParsedSchema<S> {
  const parsedSchema = schema as unknown as ParsedSchema<S>;
  Object.defineProperties(parsedSchema, {
    parse: {
      configurable: true,
      value(input: unknown) {
        return parseUnknown(schema, input);
      },
    },
    safeParse: {
      configurable: true,
      value(input: unknown) {
        return safeParseUnknown(schema, input);
      },
    },
    partial: {
      configurable: true,
      value() {
        return withParser(Schema.partial(schema));
      },
    },
  });
  return parsedSchema;
}
