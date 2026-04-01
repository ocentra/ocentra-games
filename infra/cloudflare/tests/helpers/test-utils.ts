import { describe as vitestDescribe, it, expect } from 'vitest';
import { getCurrentSuite } from 'vitest/suite';
import { TestSuiteType, SUITE_TYPE_META_KEY } from '@ocentra/logging-domain/test-log/types';
import { StorageType } from '@/constants/storage-type';
import { RunIn } from '@/constants/run-in';
import { extractName } from '../../test-runner/script/lib/extract-name.js';

type DescribeFn = () => void;
export type DescribeOptions = {
  storage?: StorageType;
  concurrent?: boolean;
  retry?: number;
  runIn?: RunIn;
  poolSequential?: boolean;
};

function runWithSuiteType(type: TestSuiteType, fn: DescribeFn): void {
  const cur = getCurrentSuite();
  const suite = cur?.suite as { meta: (() => Record<string, unknown>) | Record<string, unknown> } | undefined;
  if (!suite?.meta) {
    fn();
    return;
  }
  const meta = typeof suite.meta === 'function' ? suite.meta() : suite.meta;
  if (meta && typeof meta === 'object') (meta as Record<string, unknown>)[SUITE_TYPE_META_KEY] = type;
  fn();
}

function isDescribeOptions(x: DescribeFn | DescribeOptions): x is DescribeOptions {
  return typeof x === 'object' && x !== null;
}

function suiteDescribe(
  name: string,
  typeOrFn: TestSuiteType | DescribeFn,
  fnOrOptions?: DescribeFn | DescribeOptions,
  maybeFn?: DescribeFn
): ReturnType<typeof vitestDescribe> {
  if (typeof typeOrFn === 'function') {
    return vitestDescribe(name, typeOrFn);
  }
  const type = typeOrFn;
  const fnOrOpt = fnOrOptions;
  const optionsFirst = fnOrOpt !== undefined && isDescribeOptions(fnOrOpt);
  const fn = optionsFirst ? (maybeFn as DescribeFn) : (fnOrOpt as DescribeFn);
  const options = optionsFirst ? (fnOrOpt as DescribeOptions) : (maybeFn as DescribeOptions | undefined);
  const run = () => runWithSuiteType(type, fn);
  return options ? vitestDescribe(name, options, run) : vitestDescribe(name, run);
}

suiteDescribe.only = (
  name: string,
  typeOrFn: TestSuiteType | DescribeFn,
  fnOrOptions?: DescribeFn | DescribeOptions,
  maybeFn?: DescribeFn
) => {
  if (typeof typeOrFn === 'function') return vitestDescribe.only(name, typeOrFn);
  const type = typeOrFn;
  const fnOrOpt = fnOrOptions;
  const optionsFirst = fnOrOpt !== undefined && isDescribeOptions(fnOrOpt);
  const fn = optionsFirst ? (maybeFn as DescribeFn) : (fnOrOpt as DescribeFn);
  const options = optionsFirst ? (fnOrOpt as DescribeOptions) : (maybeFn as DescribeOptions | undefined);
  return options ? vitestDescribe.only(name, options, () => runWithSuiteType(type, fn)) : vitestDescribe.only(name, () => runWithSuiteType(type, fn));
};

suiteDescribe.skip = (
  name: string,
  typeOrFn: TestSuiteType | DescribeFn,
  fnOrOptions?: DescribeFn | DescribeOptions,
  maybeFn?: DescribeFn
) => {
  if (typeof typeOrFn === 'function') return vitestDescribe.skip(name, typeOrFn);
  const type = typeOrFn;
  const fnOrOpt = fnOrOptions;
  const optionsFirst = fnOrOpt !== undefined && isDescribeOptions(fnOrOpt);
  const fn = optionsFirst ? (maybeFn as DescribeFn) : (fnOrOpt as DescribeFn);
  const options = optionsFirst ? (fnOrOpt as DescribeOptions) : (maybeFn as DescribeOptions | undefined);
  return options ? vitestDescribe.skip(name, options, () => runWithSuiteType(type, fn)) : vitestDescribe.skip(name, () => runWithSuiteType(type, fn));
};

export { suiteDescribe as describe, it, expect, extractName, TestSuiteType, StorageType, RunIn };
