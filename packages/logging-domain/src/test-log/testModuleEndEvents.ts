type TestModuleEndPayload = {
  runId: string;
  runType: string;
  suiteType: string;
  fileKey: string;
};

const listeners: Array<(payload: TestModuleEndPayload) => void> = [];

export function emitTestModuleEnd(payload: TestModuleEndPayload): void {
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i](payload);
    } catch {
      /* listener error — continue to next */
    }
  }
}

export function onTestModuleEnd(cb: (payload: TestModuleEndPayload) => void): () => void {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i !== -1) listeners.splice(i, 1);
  };
}
