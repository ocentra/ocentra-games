const SEGMENT_WEBSOCKET_LOWER = 'websocket';
const SEGMENT_WEBSOCKET_PASCAL = 'WebSocket';
const DEFAULT_SUITE_NAME = 'Suite';
const EXT_TEST_SPEC = /\.(test|spec)\.ts$/i;

export function extractName(url: string): string {
  const basename = url.split(/[/\\]/).pop() ?? '';
  const withoutExt = basename.replace(EXT_TEST_SPEC, '');
  const segments = withoutExt.split('-');
  const pascal = segments
    .map((seg) => {
      if (seg.toLowerCase() === SEGMENT_WEBSOCKET_LOWER) return SEGMENT_WEBSOCKET_PASCAL;
      return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
    })
    .join('');
  return pascal || DEFAULT_SUITE_NAME;
}
