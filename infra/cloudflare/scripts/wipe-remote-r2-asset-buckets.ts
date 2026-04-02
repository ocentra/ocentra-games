import { config as loadEnv } from 'dotenv';
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageBucketName } from '@ocentra/boundary-domain/constants/buckets';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cloudflareRoot = join(scriptDir, '..');
const repoRoot = join(scriptDir, '..', '..', '..');

loadEnv({ path: join(repoRoot, '.env') });
loadEnv({ path: join(repoRoot, '.env.local'), override: true });
loadEnv({ path: join(cloudflareRoot, '.env'), override: true });
loadEnv({ path: join(cloudflareRoot, '.dev.vars'), override: true });

const DEV_BUCKET = `${StorageBucketName.DefaultAssets}-test`;
const PROD_BUCKET = StorageBucketName.DefaultAssets;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(
      `Missing ${name}. Set in repo-root .env / .env.local or infra/cloudflare/.env / .dev.vars (R2 S3 keys: Cloudflare → R2 → Manage R2 API Tokens).`
    );
  }
  return v;
}

function r2CredentialsForWipe(): { accessKeyId: string; secretAccessKey: string; sourceLabel: string } {
  const wipeId = process.env.R2_WIPE_ACCESS_KEY_ID?.trim();
  const wipeSecret = process.env.R2_WIPE_SECRET_ACCESS_KEY?.trim();
  if (wipeId || wipeSecret) {
    if (!wipeId || !wipeSecret) {
      throw new Error(
        'Set both R2_WIPE_ACCESS_KEY_ID and R2_WIPE_SECRET_ACCESS_KEY, or omit both and use R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.'
      );
    }
    return {
      accessKeyId: wipeId,
      secretAccessKey: wipeSecret,
      sourceLabel: 'R2_WIPE_* (maintenance; keep separate from presign keys)',
    };
  }
  const id = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!id || !secret) {
    throw new Error(
      'Missing R2 credentials for wipe. Prefer R2_WIPE_ACCESS_KEY_ID + R2_WIPE_SECRET_ACCESS_KEY (Object Read & Write, local .env only). Else R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY. Cloudflare → R2 → Manage R2 API Tokens.'
    );
  }
  return {
    accessKeyId: id,
    secretAccessKey: secret,
    sourceLabel: 'R2_* (consider R2_WIPE_* so presign keys stay read-only)',
  };
}

async function listAllKeys(client: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const obj of out.Contents ?? []) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deleteKeys(client: S3Client, bucket: string, keys: string[], dryRun: boolean): Promise<void> {
  const batchSize = 1000;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    if (dryRun) {
      console.log(
        `[wipe-remote-r2] ${bucket} dry-run: would delete batch ${i / batchSize + 1} (${batch.length} objects)`
      );
      continue;
    }
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    console.log(`[wipe-remote-r2] ${bucket} deleted ${Math.min(i + batch.length, keys.length)}/${keys.length}`);
  }
}

async function wipeBucket(client: S3Client, bucket: string, dryRun: boolean): Promise<void> {
  console.log(`[wipe-remote-r2] listing ${bucket}…`);
  const keys = await listAllKeys(client, bucket);
  console.log(`[wipe-remote-r2] ${bucket}: ${keys.length} object(s)`);
  if (keys.length === 0) {
    return;
  }
  await deleteKeys(client, bucket, keys, dryRun);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun =
    args.includes('--dry-run') || process.env.WIPE_REMOTE_R2_DRY_RUN === '1';
  const yes =
    args.includes('--yes') ||
    process.env.WIPE_REMOTE_R2_YES === '1' ||
    process.env.WIPE_R2_ASSETS_YES === '1';

  if (!yes && !dryRun) {
    console.error(
      '[wipe-remote-r2] Refusing without --yes or WIPE_REMOTE_R2_YES=1 (or legacy WIPE_R2_ASSETS_YES=1). Remote Cloudflare R2 only. Use --dry-run for counts.'
    );
    process.exit(1);
  }

  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const { accessKeyId, secretAccessKey, sourceLabel } = r2CredentialsForWipe();

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  console.log(
    '[wipe-remote-r2] Cloudflare R2 S3 API only:',
    endpoint,
    '(does not touch Miniflare, wrangler dev local persistence, or tests/.test-storage)'
  );
  console.log('[wipe-remote-r2] credential source:', sourceLabel);

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log(`[wipe-remote-r2] buckets: ${DEV_BUCKET}, ${PROD_BUCKET}`);
  console.log(
    '[wipe-remote-r2] Ignores R2_ASSETS_BUCKET_NAME (Worker-only). This run targets both buckets listed above.'
  );
  if (dryRun) {
    console.log('[wipe-remote-r2] DRY RUN — no deletes');
  }

  await wipeBucket(client, DEV_BUCKET, dryRun);
  await wipeBucket(client, PROD_BUCKET, dryRun);

  console.log('[wipe-remote-r2] done.');
}

main().catch((err) => {
  console.error('[wipe-remote-r2] failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
