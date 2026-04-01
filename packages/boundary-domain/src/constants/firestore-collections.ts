export const FirestoreCollection = {
  Users: 'users',
  Nonces: 'nonces',
  AdminActivity: 'admin_activity',
} as const;

export type FirestoreCollection = typeof FirestoreCollection[keyof typeof FirestoreCollection];
