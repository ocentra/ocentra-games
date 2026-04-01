export const AdminActivityAction = {
  Grant: 'grant',
  Revoke: 'revoke',
} as const;

export type AdminActivityAction = (typeof AdminActivityAction)[keyof typeof AdminActivityAction];

export const AdminActivityActionBackend = {
  GrantAdmin: 'grant_admin',
  Grant: 'grant',
} as const;

export const AdminActivityField = {
  Timestamp: 'timestamp',
} as const;

export const FirestoreOrderDirection = {
  Asc: 'asc',
  Desc: 'desc',
} as const;

export const AdminActivityLogLimit = 50;

export const AdminActivityUnknown = 'unknown';

export const KeyboardKey = {
  Escape: 'Escape',
} as const;
