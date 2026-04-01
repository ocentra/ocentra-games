import { AwsClient } from 'aws4fetch';

const DEFAULT_EXPIRES_SECONDS = 900;

export interface R2PresignEnvSlice {
  CLOUDFLARE_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ASSETS_BUCKET_NAME?: string;
}

export function canPresignR2AssetGet(env: R2PresignEnvSlice): boolean {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      env.R2_ACCESS_KEY_ID?.trim() &&
      env.R2_SECRET_ACCESS_KEY?.trim() &&
      env.R2_ASSETS_BUCKET_NAME?.trim()
  );
}

function encodeS3ObjectKeyPath(r2Key: string): string {
  return r2Key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export type R2PresignCredentials = {
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ASSETS_BUCKET_NAME: string;
};

export async function buildR2PresignedGetUrl(
  env: R2PresignCredentials,
  r2Key: string,
  expiresSeconds: number = DEFAULT_EXPIRES_SECONDS
): Promise<string> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID.trim();
  const bucket = env.R2_ASSETS_BUCKET_NAME.trim();
  const keyPath = encodeS3ObjectKeyPath(r2Key);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const unsigned = new URL(`https://${host}/${bucket}/${keyPath}`);
  unsigned.searchParams.set('X-Amz-Expires', String(expiresSeconds));

  const aws = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
    service: 's3',
    region: 'auto',
  });

  const signed = await aws.sign(new Request(unsigned.toString(), { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}
