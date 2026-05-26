import { isUnsafePlayerDisplayName } from '@ocentra/endpoint-domain/schemas/players';

export type PlayerHubProfileUpdatePatch = {
  displayName?: string;
  bio?: string;
  visibility?: 'public' | 'friends' | 'private';
  customTitle?: string | null;
  profileTheme?: string;
};

export type PlayerHubProfileEditorValues = {
  displayName: string;
  bio: string;
  visibility: 'public' | 'friends' | 'private';
  customTitle: string;
  profileTheme: string;
};

export type PlayerHubSettingsUpdatePatch = {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  language?: string;
  preferredServerRegion?: string;
};

export type PlayerHubSettingsEditorValues = {
  theme: '' | 'light' | 'dark' | 'auto';
  notifications: '' | 'true' | 'false';
  sound: '' | 'true' | 'false';
  language: string;
  region: string;
};

export type PlayerHubUpdatePatchResult<TPatch> = {
  patch: TPatch;
  error: string | null;
  hasChanges: boolean;
};

function boolPatchValue(value: '' | 'true' | 'false'): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function buildPlayerHubProfileUpdatePatch(
  initial: PlayerHubProfileEditorValues,
  next: PlayerHubProfileEditorValues,
  targetUserId: string,
): PlayerHubUpdatePatchResult<PlayerHubProfileUpdatePatch> {
  const patch: PlayerHubProfileUpdatePatch = {};
  const nextDisplayName = next.displayName.trim();
  if (nextDisplayName !== initial.displayName) {
    if (!nextDisplayName || isUnsafePlayerDisplayName(nextDisplayName, targetUserId)) {
      return { patch, error: 'Display name must be a real player-facing name.', hasChanges: false };
    }
    patch.displayName = nextDisplayName;
  }
  if (next.bio !== initial.bio) patch.bio = next.bio.slice(0, 512);
  if (next.visibility !== initial.visibility) patch.visibility = next.visibility;
  const nextCustomTitle = next.customTitle.trim();
  if (nextCustomTitle !== initial.customTitle) patch.customTitle = nextCustomTitle || null;
  const nextProfileTheme = next.profileTheme.trim();
  if (nextProfileTheme !== initial.profileTheme) patch.profileTheme = nextProfileTheme || 'default';
  return { patch, error: null, hasChanges: Object.keys(patch).length > 0 };
}

export function buildPlayerHubSettingsUpdatePatch(
  initial: PlayerHubSettingsEditorValues,
  next: PlayerHubSettingsEditorValues,
): PlayerHubUpdatePatchResult<PlayerHubSettingsUpdatePatch> {
  const patch: PlayerHubSettingsUpdatePatch = {};
  if (next.theme && next.theme !== initial.theme) patch.theme = next.theme;
  const nextNotifications = boolPatchValue(next.notifications);
  if (next.notifications !== initial.notifications && nextNotifications !== undefined) {
    patch.notifications = nextNotifications;
    patch.notificationsEnabled = nextNotifications;
  }
  const nextSound = boolPatchValue(next.sound);
  if (next.sound !== initial.sound && nextSound !== undefined) patch.soundEnabled = nextSound;
  const nextLanguage = next.language.trim();
  if (nextLanguage && nextLanguage !== initial.language) patch.language = nextLanguage.slice(0, 16);
  const nextRegion = next.region.trim();
  if (nextRegion && nextRegion !== initial.region) patch.preferredServerRegion = nextRegion.slice(0, 32);
  return { patch, error: null, hasChanges: Object.keys(patch).length > 0 };
}
