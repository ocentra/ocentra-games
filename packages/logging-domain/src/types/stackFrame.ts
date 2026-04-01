export interface StackFrame {
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
  function?: string;
  raw?: string;
}
