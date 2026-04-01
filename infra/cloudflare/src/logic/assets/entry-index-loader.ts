import type { Env } from '@/constants/env';
import { computeSha256Hex } from '@/utils/crypto-utils';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
  EntryIndexSchema,
  type EntryIndexDocument,
} from '@ocentra/game-asset-domain/schemas/entry-index-schema';

export async function readEntryIndexText(env: Env): Promise<string | null> {
  const object = await env.ASSETS_BUCKET!.get(AssetContentSlicePath.EntryIndex);
  if (!object) return null;
  return object.text();
}

export async function readEntryIndex(env: Env): Promise<EntryIndexDocument | null> {
  const entryIndexText = await readEntryIndexText(env);
  if (!entryIndexText) return null;

  try {
    return EntryIndexSchema.parse(JSON.parse(entryIndexText) as unknown);
  } catch {
    return null;
  }
}

export async function getEntryIndexHash(
  env: Env
): Promise<{ hash: string; entryIndex: EntryIndexDocument | null }> {
  const entryIndexText = await readEntryIndexText(env);
  if (!entryIndexText) {
    return { hash: '', entryIndex: null };
  }

  const entryIndex = EntryIndexSchema.parse(JSON.parse(entryIndexText) as unknown);
  return {
    hash: await computeSha256Hex(new TextEncoder().encode(entryIndexText)),
    entryIndex,
  };
}
