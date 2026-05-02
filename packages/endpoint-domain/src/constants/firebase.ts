import { Schema } from '@ocentra/schema-domain/effect';

export const FirebaseCallableNameSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('FirebaseCallableName'));
export type FirebaseCallableName = typeof FirebaseCallableNameSchema.Type;
export const decodeFirebaseCallableName = Schema.decodeUnknownSync(FirebaseCallableNameSchema);

export const FirebaseCallable = {
  CheckAdminStatus: decodeFirebaseCallableName('checkAdminStatus'),
  SetAdminStatus: decodeFirebaseCallableName('setAdminStatus'),
} as const;

export type FirebaseCallable = typeof FirebaseCallable[keyof typeof FirebaseCallable];

export const FirebaseUrl = {
  PublicKeys: 'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com',
} as const;

export type FirebaseUrl = typeof FirebaseUrl[keyof typeof FirebaseUrl];
