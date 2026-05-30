import { describe, expect, it } from 'vitest';
import { parseStackFrame } from './stackParser';

describe('parseStackFrame', () => {
  it('parses Chrome frames with function names', () => {
    const frame = parseStackFrame('    at runGame (https://localhost:3000/src/main.tsx:42:9)', new Map(), 10);

    expect(frame).toMatchObject({
      column: 9,
      file: 'main.tsx',
      filePath: 'https://localhost:3000/src/main.tsx',
      function: 'runGame',
      line: 42,
    });
  });

  it('parses Chrome frames without function names and Windows paths', () => {
    const frame = parseStackFrame('    at C:\\ocentra-games\\src\\main.tsx:108:17', new Map(), 10);

    expect(frame).toMatchObject({
      column: 17,
      file: 'main.tsx',
      filePath: 'C:\\ocentra-games\\src\\main.tsx',
      line: 108,
    });
  });

  it('parses Firefox frames with function names', () => {
    const frame = parseStackFrame('runGame@https://localhost:3000/src/main.tsx:88:21', new Map(), 10);

    expect(frame).toMatchObject({
      column: 21,
      file: 'main.tsx',
      filePath: 'https://localhost:3000/src/main.tsx',
      function: 'runGame',
      line: 88,
    });
  });

  it('does not parse incomplete source positions', () => {
    const frame = parseStackFrame('    at https://localhost:3000/src/main.tsx:not-a-line:21', new Map(), 10);

    expect(frame).toBeNull();
  });
});
