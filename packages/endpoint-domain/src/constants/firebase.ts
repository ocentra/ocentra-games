export type FirebaseCallableName = string & { readonly __brand: 'FirebaseCallableName' };

export const FirebaseCallable = {
  CheckAdminStatus: 'checkAdminStatus' as FirebaseCallableName,
  SetAdminStatus: 'setAdminStatus' as FirebaseCallableName,
} as const;

export type FirebaseCallable = typeof FirebaseCallable[keyof typeof FirebaseCallable];

export const FirebaseUrl = {
  PublicKeys: 'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com',
} as const;

export type FirebaseUrl = typeof FirebaseUrl[keyof typeof FirebaseUrl];
