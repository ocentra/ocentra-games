export function isExactMountMatch(remainingPath: string): boolean {
  const pathname = (remainingPath ?? '').split('?')[0];
  return pathname === '' || pathname === '/';
}
