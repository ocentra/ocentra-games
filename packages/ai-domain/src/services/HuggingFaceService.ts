import type { FetchAdapter } from '@/types/adapters';
import type { HuggingFaceRepoInfo, HuggingFaceSibling } from '@/types/huggingface';
import { fetchRepoInfo, getAvailableQuantsFromSiblings } from '@/utils/huggingface';
import { getLogger } from '@/logger/runtime';

export type HuggingFaceFile = HuggingFaceSibling;

export type HuggingFaceHeadersProvider = () => Promise<Record<string, string>>;

export interface HuggingFaceServiceDeps {
  fetch: FetchAdapter;
  getHeaders?: HuggingFaceHeadersProvider;
}

export class HuggingFaceService {
  constructor(private deps: HuggingFaceServiceDeps) {}

  async fetchRepoFiles(repo: string): Promise<HuggingFaceRepoInfo> {
    const log = getLogger();
    try {
      log.info(`Fetching repo files for: ${repo}`);
      const info = await fetchRepoInfo(this.deps.fetch, repo, this.deps.getHeaders);
      log.info(`Found ${info.siblings.length} files, task: ${info.task}`);
      return info;
    } catch (error) {
      log.error(`Failed to fetch repo files for ${repo}`, error);
      throw error;
    }
  }

  async getAvailableQuants(repo: string): Promise<Array<{ path: string; dtype: string }>> {
    const log = getLogger();
    try {
      const repoInfo = await this.fetchRepoFiles(repo);
      const quants = getAvailableQuantsFromSiblings(repoInfo.siblings, { onlyOnnxFolder: true });
      log.info(`Found ${quants.length} quants for ${repo}`);
      return quants;
    } catch (error) {
      log.error(`Failed to get quants for ${repo}`, error);
      return [];
    }
  }
}
