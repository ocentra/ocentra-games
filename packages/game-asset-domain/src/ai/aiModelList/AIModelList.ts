import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetSchemaVersion, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';

const log = MainAppLogger.instance;
log.register(import.meta.url);

export interface ModelQuantInfo {
  path: string;
  dtype: string;
  displayName?: string;
  enabled?: boolean;
  priority?: number;
}

export interface AIModelEntry {
  modelId: string;
  displayName: string;
  description?: string;
  quants: ModelQuantInfo[];
  enabled?: boolean;
  priority?: number;
  provider?: string;
  tags?: string[];
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'AIModelList',
  displayName: 'AI Model List',
  icon: '🤖',
  category: AssetTypeCategory.AI,
})
export class AIModelList extends ScriptableObject {
  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      models: [],
    };
  }

  @serializable({ label: 'List Name' })
  name: string = '';

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Models' })
  models: AIModelEntry[] = [];

  @serializable({ label: 'Default Model ID' })
  defaultModelId: string = '';

  @serializable({ label: 'Default Quant Path' })
  defaultQuantPath: string = '';
}
