import { ValidationPattern } from '@/constants/validation-pattern';

export function extractGameIdFromPath(path: string): string | null {
  const match = path.match(ValidationPattern.GameModePath);
  return match ? match[1] : null;
}

export function extractCategoryFromPath(path: string): string | null {
  const match = path.match(/GameMode\/([^/]+)\//);
  if (!match) return null;
  
  return match[1];
}

