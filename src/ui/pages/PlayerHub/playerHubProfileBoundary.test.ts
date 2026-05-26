import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@/adapters/firebase/service';
import type { ProfileResponse } from '@ocentra/api-domain/playerHub';
import {
  buildPlayerHubProfileUpdatePatch,
  buildPlayerHubSettingsUpdatePatch,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageUpdatePatches';
import { PlayerProfileResponseSchema } from '@ocentra/endpoint-domain/schemas/players';
import { ProfileUpdateRequestSchema } from '@ocentra/endpoint-domain/schemas/worker-contracts';
import {
  PLAYER_HUB_EMPTY_VALUE,
  buildPlayerHubAuthProfile,
  formatPlayerHubAccountId,
  mergePlayerHubProfile,
} from '@/ui/pages/PlayerHub/playerHubProfileBoundary';

const opaqueUserId = 'yNjWx3nznHPcQEZvrsvM4heCUZ73';

function authUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: opaqueUserId,
    displayName: 'Sujan Rana',
    email: 'sujan@example.com',
    photoURL: 'https://example.com/avatar.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastLoginAt: new Date('2026-01-02T00:00:00.000Z'),
    gamesPlayed: 7,
    wins: 4,
    losses: 3,
    winRate: 57,
    eloRating: 1210,
    achievements: ['first-win'],
    ...overrides,
  };
}

describe('player hub profile boundary', () => {
  it('rejects account-id and placeholder names at the endpoint schema', () => {
    expect(PlayerProfileResponseSchema.safeParse({
      userId: opaqueUserId,
      displayName: opaqueUserId,
    }).success).toBe(false);

    expect(PlayerProfileResponseSchema.safeParse({
      userId: 'safe-player-id',
      displayName: 'preview-player',
    }).success).toBe(false);

    expect(ProfileUpdateRequestSchema.safeParse({
      displayName: opaqueUserId,
    }).success).toBe(false);
  });

  it('accepts a real player-facing profile name', () => {
    const parsed = PlayerProfileResponseSchema.safeParse({
      userId: 'safe-player-id',
      displayName: 'Sujan Rana',
      level: 3,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBe('Sujan Rana');
    }
  });

  it('allows editable profile fields to be cleared when the user applies changes', () => {
    expect(ProfileUpdateRequestSchema.safeParse({
      bio: '',
      customTitle: null,
      visibility: 'private',
    }).success).toBe(true);
  });

  it('builds profile patches from editable changes only', () => {
    const result = buildPlayerHubProfileUpdatePatch(
      {
        displayName: 'Sujan Rana',
        bio: 'old bio',
        visibility: 'private',
        customTitle: 'Founder',
        profileTheme: 'gold',
      },
      {
        displayName: 'Sujan Rana',
        bio: '',
        visibility: 'friends',
        customTitle: '',
        profileTheme: 'gold',
      },
      opaqueUserId,
    );

    expect(result.error).toBeNull();
    expect(result.patch).toEqual({
      bio: '',
      visibility: 'friends',
      customTitle: null,
    });
  });

  it('blocks unsafe display-name edits before profile update submission', () => {
    const result = buildPlayerHubProfileUpdatePatch(
      {
        displayName: 'Sujan Rana',
        bio: '',
        visibility: 'private',
        customTitle: '',
        profileTheme: '',
      },
      {
        displayName: opaqueUserId,
        bio: '',
        visibility: 'private',
        customTitle: '',
        profileTheme: '',
      },
      opaqueUserId,
    );

    expect(result.error).toBe('Display name must be a real player-facing name.');
    expect(result.hasChanges).toBe(false);
    expect(result.patch).toEqual({});
  });

  it('builds settings patches from editable changes only', () => {
    const result = buildPlayerHubSettingsUpdatePatch(
      {
        theme: 'dark',
        notifications: 'true',
        sound: '',
        language: 'en',
        region: '',
      },
      {
        theme: 'dark',
        notifications: 'false',
        sound: 'true',
        language: 'en',
        region: 'na-east',
      },
    );

    expect(result.patch).toEqual({
      notifications: false,
      notificationsEnabled: false,
      soundEnabled: true,
      preferredServerRegion: 'na-east',
    });
  });

  it('keeps auth identity when cloud profile returns an opaque display name', () => {
    const authProfile = buildPlayerHubAuthProfile(authUser(), opaqueUserId);
    const cloudProfile = {
      userId: opaqueUserId,
      displayName: opaqueUserId,
      avatarUrl: '',
      level: 2,
    } as ProfileResponse;

    const merged = mergePlayerHubProfile(authProfile, cloudProfile, opaqueUserId);

    expect(merged?.displayName).toBe('Sujan Rana');
    expect(merged?.email).toBe('sujan@example.com');
    expect(merged?.photoURL).toBe('https://example.com/avatar.png');
    expect(merged?.level).toBe(2);
  });

  it('does not invent a profile label when every candidate is unsafe', () => {
    const authProfile = buildPlayerHubAuthProfile(authUser({
      displayName: opaqueUserId,
      email: '',
      photoURL: '',
    }), opaqueUserId);
    const cloudProfile = {
      userId: opaqueUserId,
      displayName: 'anonymous',
    } as ProfileResponse;

    const merged = mergePlayerHubProfile(authProfile, cloudProfile, opaqueUserId);

    expect(merged?.displayName).toBeUndefined();
    expect(formatPlayerHubAccountId('')).toBe(PLAYER_HUB_EMPTY_VALUE);
  });

  it('shortens account ids before they can be shown in the UI', () => {
    expect(formatPlayerHubAccountId(opaqueUserId)).toBe('yNjWx3...UZ73');
  });
});
