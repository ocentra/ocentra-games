export const getFilePathFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (pathname.includes('/src/')) {
      return pathname.split('/src/')[1] || pathname;
    }
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch {
    return url;
  }
};

export const getSourceFromFilePath = (filePath: string | undefined): string => {
  if (!filePath) return 'Browser:Other';

  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  const fileNameWithExt = normalizedPath.split('/').pop() || '';
  const fileBaseName = fileNameWithExt.split('.')[0] || fileNameWithExt;

  if (normalizedPath.includes('/auth') ||
      normalizedPath.includes('/providers/auth') ||
      normalizedPath.includes('/authentication')) {
    return 'Browser:Auth';
  }

  if (normalizedPath.includes('/assets') ||
      normalizedPath.includes('/services/assets') ||
      normalizedPath.includes('/resources')) {
    if (normalizedPath.includes('/resources/managers/')) {
      return `Browser:${fileBaseName || 'Assets'}`;
    }
    return 'Browser:Assets';
  }

  if (normalizedPath.includes('/store') ||
      normalizedPath.includes('/state') ||
      normalizedPath.includes('/services/storage') ||
      normalizedPath.includes('/redux')) {
    return 'Browser:Store';
  }

  if (normalizedPath.includes('/gamemode') ||
      normalizedPath.includes('/engine') ||
      normalizedPath.includes('/game/')) {
    return 'Browser:GameEngine';
  }

  if (normalizedPath.includes('/ui/') ||
      normalizedPath.includes('/components') ||
      normalizedPath.includes('/pages')) {
    return 'Browser:UI';
  }

  if (normalizedPath.includes('/services') ||
      normalizedPath.includes('/api') ||
      normalizedPath.includes('/network') ||
      normalizedPath.includes('/firebase') ||
      normalizedPath.includes('/solana')) {
    return 'Browser:Network';
  }

  if (normalizedPath.includes('/lib/') ||
      normalizedPath.includes('/utils') ||
      normalizedPath.includes('/helpers') ||
      normalizedPath.includes('/core')) {
    return 'Browser:System';
  }

  return 'Browser:Other';
};
