import { Schema } from '@ocentra/schema-domain/effect';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));

export const OutputDirSchema = NonEmptyString.pipe(Schema.brand('OutputDir'));
export type OutputDir = typeof OutputDirSchema.Type;
export const decodeOutputDir = Schema.decodeUnknownSync(OutputDirSchema);

export const FileKeySchema = NonEmptyString.pipe(Schema.brand('FileKey'));
export type FileKey = typeof FileKeySchema.Type;
export const decodeFileKey = Schema.decodeUnknownSync(FileKeySchema);

export const TestNameSchema = NonEmptyString.pipe(Schema.brand('TestName'));
export type TestName = typeof TestNameSchema.Type;
export const decodeTestName = Schema.decodeUnknownSync(TestNameSchema);

export const NdjsonSummaryContentSchema = Schema.String.pipe(Schema.brand('NdjsonSummaryContent'));
export type NdjsonSummaryContent = typeof NdjsonSummaryContentSchema.Type;
export const decodeNdjsonSummaryContent = Schema.decodeUnknownSync(NdjsonSummaryContentSchema);

export function asOutputDir(s: string): OutputDir {
  return decodeOutputDir(s);
}

export function asFileKey(s: string): FileKey {
  return decodeFileKey(s);
}

export function asTestName(s: string): TestName {
  return decodeTestName(s);
}

export function asNdjsonSummaryContent(s: string): NdjsonSummaryContent {
  return decodeNdjsonSummaryContent(s);
}
