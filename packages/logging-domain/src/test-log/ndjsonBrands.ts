export type OutputDir = string & { readonly __brand: 'OutputDir' };
export type FileKey = string & { readonly __brand: 'FileKey' };
export type TestName = string & { readonly __brand: 'TestName' };
export type NdjsonSummaryContent = string & { readonly __brand: 'NdjsonSummaryContent' };

export function asOutputDir(s: string): OutputDir {
  return s as OutputDir;
}

export function asFileKey(s: string): FileKey {
  return s as FileKey;
}

export function asTestName(s: string): TestName {
  return s as TestName;
}

export function asNdjsonSummaryContent(s: string): NdjsonSummaryContent {
  return s as NdjsonSummaryContent;
}
