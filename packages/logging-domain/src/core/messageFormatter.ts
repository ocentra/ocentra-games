export function formatMessage(message: string, data?: unknown): string {
  if (data !== undefined) {
    if (typeof data === 'object' && data !== null) {
      try {
        return `${message} ${JSON.stringify(data, null, 2)}`;
      } catch {
        return `${message} ${String(data)}`;
      }
    }
    return `${message} ${String(data)}`;
  }
  return message;
}
