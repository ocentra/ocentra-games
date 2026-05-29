import type { UserProfile } from '@/adapters/firebase/service';
import type { ProfileResponse } from '@ocentra/api-domain/playerHub';
import {
  isUnsafePlayerDisplayName,
  PlayerProfileResponseSchema,
} from '@ocentra/endpoint-domain/schemas/players';

export const PLAYER_HUB_EMPTY_VALUE = 'No data';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isSafeDisplayName(value: unknown, userId: string): value is string {
  const text = readString(value);
  return text.length > 0 && !isUnsafePlayerDisplayName(text, userId);
}

function selectDisplayName(userId: string, ...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (isSafeDisplayName(candidate, userId)) {
      return readString(candidate);
    }
  }
  return undefined;
}

function validateProfile(profile: Record<string, unknown>): ProfileResponse | null {
  const parsed = PlayerProfileResponseSchema.safeParse(profile);
  if (parsed.success) {
    return parsed.data as ProfileResponse;
  }
  const fallback = { ...profile };
  delete fallback.displayName;
  const fallbackParsed = PlayerProfileResponseSchema.safeParse(fallback);
  return fallbackParsed.success ? fallbackParsed.data as ProfileResponse : null;
}

export function buildPlayerHubAuthProfile(user: UserProfile | null, userId: string): ProfileResponse | null {
  const resolvedUserId = readString(userId || user?.uid);
  if (!user || !resolvedUserId) return null;
  const displayName = selectDisplayName(resolvedUserId, user.displayName);
  const profile: Record<string, unknown> = {
    uid: user.uid,
    userId: resolvedUserId,
    email: readString(user.email),
    photoURL: readString(user.photoURL),
    avatarUrl: readString(user.photoURL),
    gamesPlayed: readNumber(user.gamesPlayed),
    wins: readNumber(user.wins),
    losses: readNumber(user.losses),
    winRate: readNumber(user.winRate),
    eloRating: readNumber(user.eloRating),
    achievements: user.achievements,
    isAdmin: user.isAdmin,
    isGuest: user.isGuest,
  };
  if (displayName) {
    profile.displayName = displayName;
  }
  return validateProfile(profile);
}

export function mergePlayerHubProfile(
  authProfile: ProfileResponse | null,
  cloudProfile: ProfileResponse | null,
  userId: string,
): ProfileResponse | null {
  if (!authProfile && !cloudProfile) return null;
  const resolvedUserId = readString(userId || cloudProfile?.userId || authProfile?.userId);
  if (!resolvedUserId) return null;
  const displayName = selectDisplayName(resolvedUserId, cloudProfile?.displayName, authProfile?.displayName);
  const merged: Record<string, unknown> = {
    ...(authProfile ?? {}),
    ...(cloudProfile ?? {}),
    userId: resolvedUserId,
  };
  if (displayName) {
    merged.displayName = displayName;
  } else {
    delete merged.displayName;
  }
  const authEmail = readString(authProfile?.email);
  if (!readString(merged.email) && authEmail) {
    merged.email = authEmail;
  }
  const authPhotoUrl = readString(authProfile?.photoURL ?? authProfile?.avatarUrl);
  if (!readString(merged.photoURL) && authPhotoUrl) {
    merged.photoURL = authPhotoUrl;
  }
  if (!readString(merged.avatarUrl) && authPhotoUrl) {
    merged.avatarUrl = authPhotoUrl;
  }
  return validateProfile(merged);
}

export function formatPlayerHubAccountId(value: string): string {
  const text = readString(value);
  if (!text) return PLAYER_HUB_EMPTY_VALUE;
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}
