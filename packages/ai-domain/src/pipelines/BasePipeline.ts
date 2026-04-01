/// <reference lib="dom" />
import { LoadingStatusTypes } from './LoadingStatusTypes';
import { type PipelineProgressInfo, type EnhancedProgressCallback } from './PipelineTypes';
import { BaseModelConfig } from './PipelineConfigs';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_GENERAL = false;

export abstract class BasePipeline<TConfig extends BaseModelConfig = BaseModelConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected tokenizer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected model: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected processor: any = null;
  protected currentConfig: TConfig | null = null;

  protected needsReload(newConfig: TConfig): boolean {
    if (this.currentConfig === null) return true;
    return !this.currentConfig.equals(newConfig);
  }

  protected wrapProgressCallback(
    progressCallback: EnhancedProgressCallback | undefined,
    loadId: string | undefined,
    component: string,
    progressRange: [number, number]
  ): ((data: { status?: string; progress?: number; file?: string; loaded?: number; total?: number }) => void) | undefined {
    if (!progressCallback) return undefined;

    const [minProgress, maxProgress] = progressRange;
    const progressSpan = maxProgress - minProgress;

    return (data: { status?: string; progress?: number; file?: string; loaded?: number; total?: number }) => {
      let progress = minProgress;
      let status: PipelineProgressInfo['status'] = LoadingStatusTypes.PROGRESS;
      let message = `Loading ${component} from cache...`;

      if (data.status === 'progress') {
        progress = minProgress + ((data.progress ?? 0) * progressSpan);
        status = LoadingStatusTypes.PROGRESS;
        message = `Loading ${component} from cache... ${Math.round(progress)}%`;
      } else if (data.status === 'ready' || data.status === 'done') {
        progress = maxProgress;
        status = LoadingStatusTypes.DONE;
        message = `${component.charAt(0).toUpperCase() + component.slice(1)} ready`;
      }

      progressCallback({
        status,
        file: data.file || component,
        progress,
        loadId,
        loaded: data.loaded,
        total: data.total,
        message
      });
    };
  }

  abstract load(config: TConfig, progressCallback?: EnhancedProgressCallback, loadId?: string): Promise<void>;

  reset(): void {
    this.tokenizer = null;
    this.model = null;
    this.processor = null;
    this.currentConfig = null;
    if (LOG_GENERAL) {
      logInfo('Pipeline reset', undefined, LOG_GENERAL);
    }
  }

  isLoaded(): boolean {
    return this.model !== null;
  }

  getConfig(): TConfig | null {
    return this.currentConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTokenizer(): any {
    return this.tokenizer;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModel(): any {
    return this.model;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProcessor(): any {
    return this.processor;
  }
}
