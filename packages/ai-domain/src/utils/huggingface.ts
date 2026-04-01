import type { FetchAdapter } from '@/types/adapters';
import type { HuggingFaceRepoInfo, HuggingFaceSibling, QuantEntry } from '@/types/huggingface';
import { HUGGINGFACE_MODELS_API } from '@/constants/huggingface';
import { DTYPE_PRIORITY } from '@/constants/huggingface';
import { extractDtypeFromPath } from '@/utils/dtype';

const CURRENT_MANIFEST_VERSION = 1;

export async function fetchRepoInfo(
  fetchAdapter: FetchAdapter,
  repo: string,
  getHeaders?: () => Promise<Record<string, string>>
): Promise<HuggingFaceRepoInfo> {
  const url = `${HUGGINGFACE_MODELS_API}/${repo}`;
  const headers = getHeaders ? await getHeaders() : { Accept: 'application/json' };
  let resp = await fetchAdapter.fetch(url, { headers });
  if (resp.status === 401 && typeof headers.Authorization === 'string' && headers.Authorization.length > 0) {
    resp = await fetchAdapter.fetch(url, { headers: { Accept: 'application/json' } });
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to fetch repo files for ${repo}: ${resp.status} ${resp.statusText}${text ? ` ${text}` : ''}`);
  }
  const json = (await resp.json()) as { siblings?: { rfilename: string; size?: number }[]; pipeline_tag?: string; task?: string };
  const siblings = Array.isArray(json.siblings)
    ? json.siblings.filter((e): e is HuggingFaceSibling => typeof e?.rfilename === 'string')
    : [];
  const baseRepoUrl = `https://huggingface.co/${repo}/resolve/main/`;
  await Promise.all(
    siblings.map(async (entry) => {
      if (typeof entry.size !== 'number' || !Number.isFinite(entry.size) || entry.size <= 0) {
        try {
          const headResp = await fetchAdapter.fetch(baseRepoUrl + entry.rfilename, { method: 'HEAD' });
          if (headResp.ok) {
            const len = headResp.headers.get('Content-Length');
            if (len) entry.size = parseInt(len, 10);
          }
        } catch {
          // leave size undefined
        }
      }
    })
  );
  return {
    siblings,
    task: json.pipeline_tag ?? json.task ?? 'text-generation',
    pipeline_tag: json.pipeline_tag ?? json.task ?? 'text-generation',
  };
}

export interface GetAvailableQuantsOptions {
  onlyOnnxFolder?: boolean;
}

export function getAvailableQuantsFromSiblings(
  siblings: HuggingFaceSibling[],
  options: GetAvailableQuantsOptions = {}
): QuantEntry[] {
  const { onlyOnnxFolder = false } = options;
  const quants: QuantEntry[] = [];
  for (const file of siblings) {
    if (!file.rfilename.endsWith('.onnx')) continue;
    if (onlyOnnxFolder && !file.rfilename.includes('onnx/')) continue;
    const path = file.rfilename;
    const dtype = extractDtypeFromPath(path);
    quants.push({ path, dtype });
  }
  quants.sort((a, b) => {
    const priorityA = DTYPE_PRIORITY[a.dtype] ?? 999;
    const priorityB = DTYPE_PRIORITY[b.dtype] ?? 999;
    return priorityA - priorityB;
  });
  return quants;
}

export { CURRENT_MANIFEST_VERSION };
