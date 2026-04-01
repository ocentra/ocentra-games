import type { RegistrationInfo } from '@/types/registrationInfo';
import type { PathResolver } from '@/core/pathResolver';

export function findRegisteredUserByFilePath(
  filePath: string | undefined,
  registeredUsers: Map<string, RegistrationInfo>
): RegistrationInfo | null {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/\\/g, '/').split('?')[0].split('#')[0];

  for (const registration of registeredUsers.values()) {
    if (!registration.filePath) continue;

    const normalizedRegistered = registration.filePath.replace(/\\/g, '/');

    if (normalizedPath === normalizedRegistered) {
      return registration;
    }

    if (normalizedPath.endsWith(normalizedRegistered) || normalizedRegistered.endsWith(normalizedPath)) {
      return registration;
    }

    const registeredFileName = normalizedRegistered.split('/').pop()?.split('?')[0]?.split('#')[0];
    const pathFileName = normalizedPath.split('/').pop()?.split('?')[0]?.split('#')[0];
    if (registeredFileName && pathFileName && registeredFileName === pathFileName) {
      return registration;
    }

    if (normalizedPath.includes(normalizedRegistered) || normalizedRegistered.includes(normalizedPath)) {
      return registration;
    }
  }

  return null;
}

export function extractNameFromUrl(url: string | undefined): string {
  if (!url) {
    return 'Module';
  }
  const basename = url.split(/[/\\]/).pop() ?? '';
  const withoutExt = basename.replace(/\.(test|spec)\.(ts|js)$/i, '').replace(/\.(ts|js)$/i, '');
  const segments = withoutExt.split('-');
  const pascal = segments
    .map((seg) => {
      if (seg.toLowerCase() === 'websocket') return 'WebSocket';
      return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
    })
    .join('');
  return pascal || 'Module';
}

export function registerUser(
  context: object | string,
  filePathOrUrl: string | undefined,
  pathResolver: PathResolver,
  registeredUsers: Map<string, RegistrationInfo>,
  maxRegistrations: number,
  batchKey?: string
): void {
  if (registeredUsers.size >= maxRegistrations) {
    console.warn('[Logger] Maximum registrations reached. Skipping registration.');
    return;
  }

  let className: string;
  if (typeof context === 'string') {
    className = context;
  } else if (filePathOrUrl) {
    className = extractNameFromUrl(filePathOrUrl);
  } else {
    className = context.constructor.name;
  }

  let resolvedFilePath = filePathOrUrl;
  if (resolvedFilePath && (resolvedFilePath.startsWith('file://') || resolvedFilePath.includes('://'))) {
    resolvedFilePath = pathResolver.getFilePathFromUrl(resolvedFilePath);
  }

  const key = `${className}_${resolvedFilePath || 'unknown'}`;

  if (!registeredUsers.has(key)) {
    registeredUsers.set(key, {
      className,
      filePath: resolvedFilePath,
      registeredAt: Date.now(),
      ...(batchKey !== undefined && { batchKey }),
    });
  }
}

export function unregisterUser(
  context: object | string,
  filePathOrUrl: string | undefined,
  pathResolver: PathResolver,
  registeredUsers: Map<string, RegistrationInfo>
): void {
  let className: string;
  if (typeof context === 'string') {
    className = context;
  } else {
    className = context.constructor.name;
  }

  let resolvedFilePath = filePathOrUrl;
  if (resolvedFilePath && (resolvedFilePath.startsWith('file://') || resolvedFilePath.includes('://'))) {
    resolvedFilePath = pathResolver.getFilePathFromUrl(resolvedFilePath);
  }

  const key = `${className}_${resolvedFilePath || 'unknown'}`;
  registeredUsers.delete(key);
}
