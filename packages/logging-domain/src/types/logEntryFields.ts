export const LogEntryField = {
  Id: 'id',
  Origin: 'origin',
  Level: 'level',
  Context: 'context',
  Message: 'message',
  Source: 'source',
  Timestamp: 'timestamp',
  Args: 'args',
  Stack: 'stack',
  StackFrames: 'stackFrames',
  File: 'file',
  FilePath: 'filePath',
  Line: 'line',
  Column: 'column',
} as const;

export type LogEntryField = typeof LogEntryField[keyof typeof LogEntryField];
