import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { InferenceSettings } from '@ocentra/ai-domain/types/inference-settings';
import { DEFAULT_INFERENCE_SETTINGS } from '@ocentra/ai-domain/types/inference-settings';
import { AssetSchemaVersion, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'ModelQuantSettings',
  displayName: 'Model Quant Settings',
  icon: '⚙️',
  category: AssetTypeCategory.AI,
})
export class ModelQuantSettings extends ScriptableObject {

  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {};
  }

  @serializable({ label: 'Model ID' })
  modelId: string = '';

  @serializable({ label: 'Quant Path' })
  quantPath: string = '';

  @serializable({ label: 'Display Name' })
  override displayName: string = '';

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Settings' })
  settings: InferenceSettings = { ...DEFAULT_INFERENCE_SETTINGS };

  static generateModelQuantAssetId(modelId: string, quantPath: string): string {
    const sanitizedModelId = modelId.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedQuant = quantPath
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/\.onnx$/, '')
      .replace(/^onnx_/, '');
    return `${sanitizedModelId}_${sanitizedQuant}`;
  }

  static create(modelId: string, quantPath: string): ModelQuantSettings {
    const asset = new ModelQuantSettings();
    asset.modelId = modelId;
    asset.quantPath = quantPath;
    asset.displayName = `${modelId.split('/').pop()} (${quantPath.split('/').pop()?.replace('.onnx', '')})`;
    asset.settings = { ...DEFAULT_INFERENCE_SETTINGS };
    return asset;
  }
}
