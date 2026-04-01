import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const FIREBASE_FIRESTORE_BASE = 'https://firestore.googleapis.com';
const FIREBASE_FIRESTORE_USER_PATH = (projectId: string, userId: string) => `/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
const FIREBASE_FIRESTORE_USERS_PATH = (projectId: string) => `/v1/projects/${projectId}/databases/(default)/documents/users`;
const FIREBASE_FIRESTORE_ADMIN_ACTIVITY_PATH = (projectId: string) => `/v1/projects/${projectId}/databases/(default)/documents/admin_activity`;

export function getFirestoreUserUrl(projectId: string, userId: string): string {
  return buildFullUrl(FIREBASE_FIRESTORE_USER_PATH(projectId, userId), { baseUrl: FIREBASE_FIRESTORE_BASE });
}

export function getFirestoreUsersCollectionUrl(projectId: string): string {
  return buildFullUrl(FIREBASE_FIRESTORE_USERS_PATH(projectId), { baseUrl: FIREBASE_FIRESTORE_BASE });
}

export function getFirestoreAdminActivityCollectionUrl(projectId: string): string {
  return buildFullUrl(FIREBASE_FIRESTORE_ADMIN_ACTIVITY_PATH(projectId), { baseUrl: FIREBASE_FIRESTORE_BASE });
}
