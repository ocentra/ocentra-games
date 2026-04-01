const TEST_NAME_BRAND = Symbol('TestName');

export type TestName = string & { readonly [TEST_NAME_BRAND]: true };

const PRINTABLE_ASCII = /^[\x20-\x7E]*$/;

export function toTestName(s: string): TestName {
  if (!PRINTABLE_ASCII.test(s)) {
    const bad = [...s].find((c) => c.codePointAt(0)! > 0x7e || c.codePointAt(0)! < 0x20);
    const at = bad ? s.indexOf(bad) : 0;
    const code = bad ? bad.codePointAt(0) : 0;
    throw new Error(
      `Test name must be printable ASCII only (used as X-Test-Name header). Invalid character at index ${at} (code point ${code}). Use hyphen and "to" not en-dash/arrow.`
    );
  }
  return s as TestName;
}

export function testName(s: string): TestName {
  return toTestName(s);
}
