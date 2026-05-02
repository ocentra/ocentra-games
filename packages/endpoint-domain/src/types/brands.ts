import { Schema } from '@ocentra/schema-domain/effect';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const SlashPathString = NonEmptyString.pipe(
  Schema.filter((value) => value.startsWith('/') || 'Expected a path starting with /'),
);

export const ApiPathSchema = SlashPathString.pipe(Schema.brand('ApiPath'));
export type ApiPath = typeof ApiPathSchema.Type;

export const DOPathSchema = SlashPathString.pipe(Schema.brand('DOPath'));
export type DOPath = typeof DOPathSchema.Type;

export const EndpointIdSchema = NonEmptyString.pipe(Schema.brand('EndpointId'));
export type EndpointId = typeof EndpointIdSchema.Type;

export const HandlerKeySchema = NonEmptyString.pipe(Schema.brand('HandlerKey'));
export type HandlerKey = typeof HandlerKeySchema.Type;

export const PathSegmentSchema = NonEmptyString.pipe(
  Schema.filter((value) => !value.includes('/') || 'Expected one path segment without /'),
  Schema.brand('PathSegment'),
);
export type PathSegment = typeof PathSegmentSchema.Type;

export const QueryParamSchema = NonEmptyString.pipe(Schema.brand('QueryParam'));
export type QueryParam = typeof QueryParamSchema.Type;

export const HeaderNameSchema = NonEmptyString.pipe(Schema.brand('HeaderName'));
export type HeaderName = typeof HeaderNameSchema.Type;

export const decodeApiPath = Schema.decodeUnknownSync(ApiPathSchema);
export const decodeDOPath = Schema.decodeUnknownSync(DOPathSchema);
export const decodeEndpointId = Schema.decodeUnknownSync(EndpointIdSchema);
export const decodeHandlerKey = Schema.decodeUnknownSync(HandlerKeySchema);
export const decodePathSegment = Schema.decodeUnknownSync(PathSegmentSchema);
export const decodeQueryParam = Schema.decodeUnknownSync(QueryParamSchema);
export const decodeHeaderName = Schema.decodeUnknownSync(HeaderNameSchema);
