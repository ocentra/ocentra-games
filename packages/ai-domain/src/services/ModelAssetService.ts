import type { AIModelEntry } from '@/types/ai-model-list';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ModelAvailableEvent, type AvailableModel } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent';
import { ensureManifestForRepos } from '@/services/ManifestService';
import {
  getManifestEntry,
  getUserAddedModels as getStoredUserAddedModels,
  removeUserAddedModel as removeStoredUserAddedModel,
  saveUserAddedModel,
  validateHuggingFaceModel,
} from '@/storage/model-storage-api';
import { QUANT_STATUS } from '@/constants/quant-status';
import { extractDtypeFromPath } from '@/utils/dtype';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_AI = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LEGACY_DEFAULT_MODEL_IDS = new Set<string>([
  'onnx-community/Phi-3-mini-instruct-onnx-web',
  'onnx-community/Llama-3.2-3B-Instruct-onnx-web',
  'onnx-community/TinyLlama-1.1B-Chat-v1.0-onnx-web',
]);

export interface ModelAssetServiceAdapters {
  loadModelList: (assetId: string) => Promise<{ models: AIModelEntry[] } | null>;
  getAvailableQuantsFromHF: (modelId: string) => Promise<Array<{ path: string; dtype: string }>>;
  defaultModelEntries: AIModelEntry[];
}

export class ModelAssetService {
  private quantCache: Map<string, Array<{ path: string; dtype: string; status: 'available' | 'downloaded' | 'failed' }>> = new Map();
  private manifestEnsuredRepos: Set<string> = new Set();
  private manifestEnsuringRepos: Set<string> = new Set();

  constructor(private adapters: ModelAssetServiceAdapters) {}

  async addUserModel(repoId: string): Promise<{ repo: string; task: string; onnxFiles: number }> {
    const trimmedRepo = repoId.trim();
    if (!trimmedRepo) {
      throw new Error('Model repository is required.');
    }
    const validation = await validateHuggingFaceModel(trimmedRepo);
    if (!validation.valid) {
      throw new Error(validation.error || 'Model validation failed.');
    }
    const task = validation.task || 'text-generation';
    await saveUserAddedModel({
      repo: trimmedRepo,
      displayName: trimmedRepo.split('/').pop() || trimmedRepo,
      task,
    });
    await ensureManifestForRepos([trimmedRepo], true);
    this.quantCache.delete(trimmedRepo);
    this.manifestEnsuredRepos.add(trimmedRepo);
    return {
      repo: trimmedRepo,
      task,
      onnxFiles: validation.onnxFiles?.length ?? 0,
    };
  }

  async removeUserModel(repoId: string): Promise<void> {
    const trimmedRepo = repoId.trim();
    if (!trimmedRepo) {
      return;
    }
    await removeStoredUserAddedModel(trimmedRepo);
    this.quantCache.delete(trimmedRepo);
    this.manifestEnsuredRepos.delete(trimmedRepo);
  }

  async listUserModels(assetId: string = 'default'): Promise<Array<{ repo: string; task: string }>> {
    const userModels = await this.getUserModels(assetId);
    return userModels.map((model) => ({
      repo: model.repo,
      task: model.task || 'text-generation',
    }));
  }

  async getConfiguredModelIds(assetId: string = 'default'): Promise<string[]> {
    const models = await this.getConfiguredModelEntries(assetId);
    return models.map((model) => model.modelId);
  }

  async refreshManifests(assetId: string = 'default', forceRebuild: boolean = true): Promise<void> {
    const repos = await this.getConfiguredModelIds(assetId);
    if (repos.length === 0) {
      return;
    }
    await ensureManifestForRepos(repos, forceRebuild);
    this.quantCache.clear();
    this.manifestEnsuredRepos.clear();
    this.manifestEnsuringRepos.clear();
  }

  async getAvailableModels(assetId: string = 'default'): Promise<AvailableModel[]> {
    try {
      const enabledModels = await this.getConfiguredModelEntries(assetId);
      if (enabledModels.length === 0) {
        return [];
      }
      void this.ensureManifestsForModels(enabledModels, true);
      const resolvedModels = await Promise.all(
        enabledModels.map(async (model) => {
          try {
            return await this.resolveModelQuants(model);
          } catch (error) {
            logError('Failed to resolve model quants', { error, modelId: model.modelId }, LOG_AI);
            return {
              model,
              quants: [],
            };
          }
        })
      );

      const availableModels: AvailableModel[] = resolvedModels
        .map(({ model, quants }) => ({
          modelId: model.modelId,
          quants: quants.map((quant) => ({
            path: quant.path,
            dtype: quant.dtype,
            status: quant.status,
          })),
          task: 'text-generation',
        }))
        .sort((a: AvailableModel, b: AvailableModel) => {
          const modelA = enabledModels.find((m: AIModelEntry) => m.modelId === a.modelId);
          const modelB = enabledModels.find((m: AIModelEntry) => m.modelId === b.modelId);
          const priorityA = modelA?.priority ?? 999;
          const priorityB = modelB?.priority ?? 999;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.modelId.localeCompare(b.modelId);
        });

      logInfo(`Loaded ${availableModels.length} models from asset: ${assetId}`, undefined, LOG_AI);

      return availableModels;
    } catch (error) {
      logError(`Failed to load models from asset ${assetId}:`, error, LOG_AI);
      return [];
    }
  }

  async getAllModelLists(): Promise<string[]> {
    return ['default'];
  }

  private async getConfiguredModelEntries(assetId: string): Promise<AIModelEntry[]> {
    const baseModels = await this.getEnabledAssetModels(assetId);
    const userModels = await this.getUserModels(assetId);
    const modelMap = new Map<string, AIModelEntry>();
    for (const model of baseModels) {
      modelMap.set(model.modelId, model);
    }
    let index = 0;
    for (const model of userModels) {
      if (!modelMap.has(model.repo)) {
        modelMap.set(model.repo, {
          modelId: model.repo,
          displayName: model.repo.split('/').pop() || model.repo,
          description: 'User-added HuggingFace model',
          quants: [],
          enabled: true,
          priority: 1000 + index,
          provider: 'local',
          tags: ['user-added'],
        });
      }
      index += 1;
    }
    return Array.from(modelMap.values());
  }

  private async getEnabledAssetModels(assetId: string): Promise<AIModelEntry[]> {
    const asset = await this.adapters.loadModelList(assetId);
    if (!asset) {
      logInfo(`No model list asset found: ${assetId}`, undefined, LOG_AI);
      return [];
    }
    const rawModels = Array.isArray(asset.models) ? asset.models : [];
    let enabledModels = rawModels.filter(
      (model: AIModelEntry) =>
        model.enabled !== false &&
        typeof model.modelId === 'string' &&
        model.modelId.length > 0
    );
    if (assetId === 'default') {
      enabledModels = this.mergeWithDefaultModels(enabledModels);
    }
    return enabledModels;
  }

  private async getUserModels(assetId: string): Promise<Array<{ repo: string; task?: string }>> {
    const configuredModels = await this.getEnabledAssetModels(assetId);
    const defaultModels = new Set(configuredModels.map((model) => model.modelId));
    for (const legacyModel of LEGACY_DEFAULT_MODEL_IDS) {
      defaultModels.add(legacyModel);
    }
    const stored = await getStoredUserAddedModels(defaultModels);
    return stored.map((entry) => ({
      repo: entry.repo,
      task: entry.task,
    }));
  }

  private async resolveModelQuants(model: AIModelEntry): Promise<{
    model: AIModelEntry;
    quants: Array<{ path: string; dtype: string; status: 'available' | 'downloaded' | 'failed' }>;
  }> {
    const manifest = await getManifestEntry(model.modelId);
    if (manifest?.quants) {
      const manifestQuants = this.mapManifestQuants(manifest.quants);
      return { model, quants: manifestQuants };
    }

    const cached = this.quantCache.get(model.modelId);
    if (cached && cached.length > 0) {
      return { model, quants: [...cached] };
    }

    const fallbackQuants = [...(Array.isArray(model.quants) ? model.quants : [])]
      .filter((quant: { enabled?: boolean }) => quant.enabled !== false)
      .sort((a: { path: string; priority?: number }, b: { path: string; priority?: number }) => {
        const priorityA = a.priority ?? 999;
        const priorityB = b.priority ?? 999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.path.localeCompare(b.path);
      })
      .map((quant: { path: string; dtype: string }) => ({
        path: quant.path,
        dtype: quant.dtype,
        status: QUANT_STATUS.AVAILABLE as 'available',
      }));
    if (fallbackQuants.length > 0) {
      return { model, quants: fallbackQuants };
    }

    const fromHF = await this.adapters.getAvailableQuantsFromHF(model.modelId);
    if (fromHF.length > 0) {
      const resolvedFromHF = fromHF.map((quant) => ({
        path: quant.path,
        dtype: quant.dtype,
        status: QUANT_STATUS.AVAILABLE as 'available',
      }));
      this.quantCache.set(model.modelId, resolvedFromHF);
      return { model, quants: resolvedFromHF };
    }

    return { model, quants: [] };
  }

  private async ensureManifestsForModels(models: AIModelEntry[], notifyOnComplete: boolean): Promise<void> {
    const repos = models
      .map((model) => model.modelId)
      .filter(
        (repo) =>
          !this.manifestEnsuredRepos.has(repo) &&
          !this.manifestEnsuringRepos.has(repo)
      );
    if (repos.length === 0) {
      return;
    }
    repos.forEach((repo) => this.manifestEnsuringRepos.add(repo));
    try {
      await ensureManifestForRepos(repos);
      repos.forEach((repo) => this.manifestEnsuredRepos.add(repo));
      if (notifyOnComplete) {
        EventBus.instance.publish(
          new ModelAvailableEvent({
            modelId: repos[0],
            quants: [],
            task: 'text-generation',
          })
        );
      }
    } catch (error) {
      logError('Failed to ensure manifests for model list', { error, repos }, LOG_AI);
    } finally {
      repos.forEach((repo) => this.manifestEnsuringRepos.delete(repo));
    }
  }

  private mergeWithDefaultModels(models: AIModelEntry[]): AIModelEntry[] {
    const modelMap = new Map<string, AIModelEntry>();
    for (const model of models) {
      modelMap.set(model.modelId, model);
    }
    for (const defaultModel of this.adapters.defaultModelEntries) {
      if (!modelMap.has(defaultModel.modelId)) {
        modelMap.set(defaultModel.modelId, defaultModel);
      }
    }
    return Array.from(modelMap.values());
  }

  private mapManifestQuants(
    quantsMap: Record<string, { status: string; dtype?: string }>
  ): Array<{ path: string; dtype: string; status: 'available' | 'downloaded' | 'failed' }> {
    return Object.entries(quantsMap)
      .map(([path, quant]) => {
        const mappedStatus = this.mapManifestStatus(quant.status);
        if (!mappedStatus) {
          return null;
        }
        return {
          path,
          dtype: quant.dtype || extractDtypeFromPath(path),
          status: mappedStatus,
        };
      })
      .filter((quant): quant is { path: string; dtype: string; status: 'available' | 'downloaded' | 'failed' } => quant !== null)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  private mapManifestStatus(
    status: string
  ): 'available' | 'downloaded' | 'failed' | null {
    if (status === QUANT_STATUS.DOWNLOADED) {
      return QUANT_STATUS.DOWNLOADED;
    }
    if (status === QUANT_STATUS.FAILED) {
      return QUANT_STATUS.FAILED;
    }
    if (
      status === QUANT_STATUS.UNSUPPORTED ||
      status === QUANT_STATUS.UNAVAILABLE ||
      status === QUANT_STATUS.SERVER_ONLY ||
      status === QUANT_STATUS.NOT_FOUND
    ) {
      return null;
    }
    return QUANT_STATUS.AVAILABLE;
  }
}

let modelAssetServiceInstance: ModelAssetService | null = null;

export function createModelAssetService(adapters: ModelAssetServiceAdapters): ModelAssetService {
  if (modelAssetServiceInstance) {
    return modelAssetServiceInstance;
  }
  modelAssetServiceInstance = new ModelAssetService(adapters);
  return modelAssetServiceInstance;
}

export function getModelAssetService(): ModelAssetService {
  if (!modelAssetServiceInstance) {
    throw new Error('ModelAssetService not initialized. Call createModelAssetService first.');
  }
  return modelAssetServiceInstance;
}
