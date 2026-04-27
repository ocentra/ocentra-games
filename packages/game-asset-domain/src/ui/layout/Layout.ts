import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

export type LayoutType =
  | 'single-column'
  | 'two-column'
  | 'three-column'
  | 'grid'
  | 'sidebar'
  | 'custom';

export interface LayoutSection {
  id: string;
  type: string;
  contentRef?: AssetReference | string;
  width?: string;
  order?: number;
  [key: string]: unknown;
}

export interface LayoutStructure {
  type: LayoutType;
  sections: LayoutSection[];
  gap?: string;
  padding?: string;
  [key: string]: unknown;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'Layout',
  displayName: 'Layout',
  icon: '📐',
  category: AssetTypeCategory.UI,
})
export abstract class Layout extends ScriptableObject {
  static override schemaVersion = 1;
  static readonly requiresInspector = false;

  static override createTemplate(): Record<string, unknown> {
    return {};
  }

  @serializable({ label: 'Layout' })
  layout: LayoutStructure = {
    type: 'custom',
    sections: [],
  };
}

