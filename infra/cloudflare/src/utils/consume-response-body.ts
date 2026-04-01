export async function consumeResponseBody(response: Response): Promise<void> {
  if (response.bodyUsed) return;
  try {
    await response.arrayBuffer();
  } catch {
    try {
      await response.text();
    } catch {
      try {
        await response.blob();
      } catch {
        void 0;
      }
    }
  }
}
