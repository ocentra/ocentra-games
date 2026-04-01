import 'reflect-metadata';
import { serializable, serializableClass, required } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import type { AssetGUIDType } from '@/types/assetIdentifier';
import type { AssetType } from '@/types/assetType';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

export type AssetLoader<T> = (constructor: new () => T, guid: string) => Promise<T | null>;

let globalLoader: AssetLoader<unknown> | null = null;

export function setGlobalAssetLoader(loader: AssetLoader<unknown> | null): void {
  globalLoader = loader;
}

@serializableClass({
  assetType: 'AssetResourceEntry',
  displayName: 'Asset Resource Entry',
  icon: '📄',
  category: AssetTypeCategory.Content,
})
export class AssetResourceEntry<T = unknown> extends ResourceEntry {
  @required('Asset GUID is required for AssetResourceEntry')
  @serializable({ label: 'Asset GUID' })
  guid: AssetGUIDType = '' as AssetGUIDType;

  @required('Asset Type is required for AssetResourceEntry')
  @serializable({ label: 'Asset Type' })
  readonly assetType: AssetType;

  constructor(assetType?: AssetType, guid?: AssetGUIDType) {
    super();
    if (!assetType || assetType === '' || assetType === 'Unknown') {
      this.assetType = '' as AssetType;
    } else {
      this.assetType = assetType;
    }
    if (guid && guid !== '') {
      this.guid = guid;
    } else {
      this.guid = '' as AssetGUIDType;
    }
  }

  @serializable({ label: 'Inheritance Chain' })
  inheritanceChain?: string[] | null;

  @serializable({ label: 'Variant' })
  variant?: string | null;

  public loadedAsset: T | null = null;
  private loading: boolean = false;
  public parsedData?: { system: Record<string, unknown>; data: Record<string, unknown> } | null;

  get assetGuid(): string | null {
    if (!this.guid) {
      return null;
    }
    return this.guid;
  }

  setAssetGuid(guid: string | null): void {
    this.guid = (guid || '') as AssetGUIDType;
  }

  get asset(): T | null {
    return this.loadedAsset;
  }

  get isLoading(): boolean {
    return this.loading;
  }

  async load<TLoad = T>(
    constructor: new () => TLoad,
    loader?: AssetLoader<TLoad>
  ): Promise<TLoad | null> {
    if (this.loadedAsset) {
      return this.loadedAsset as TLoad;
    }

    if (this.loading) {
      return null;
    }

    if (!this.guid) {
      return null;
    }

    const effectiveLoader = loader || (globalLoader as AssetLoader<TLoad> | null);
    if (!effectiveLoader) {
      return null;
    }

    this.loading = true;

    try {
      const asset = await effectiveLoader(constructor, this.guid);
      this.loadedAsset = asset as T;
      if (asset && !this.guid) {
        this.guid = (asset as { guid?: { toString?: () => string } }).guid?.toString?.() as AssetGUIDType || this.guid;
      }
      if (asset && (!this.assetType || this.assetType === '')) {
        const Constructor = (asset as { constructor?: { assetType?: string; displayName?: string; name?: string } }).constructor;
        const assetTypeValue = Constructor?.assetType || Constructor?.name || '';
        if (assetTypeValue) {
          (this as { assetType: AssetType }).assetType = assetTypeValue as AssetType;
        }
      }
      if (asset && !this.displayName) {
        const Constructor = (asset as { constructor?: { displayName?: string } }).constructor;
        const displayNameValue = Constructor?.displayName || '';
        if (displayNameValue) {
          this.displayName = displayNameValue;
        }
      }
      return asset;
    } catch {
      return null;
    } finally {
      this.loading = false;
    }
  }

  setAsset(asset: T | null): void {
    this.loadedAsset = asset;
    if (asset && typeof asset === 'object') {
      const assetObj = asset as { guid?: { toString?: () => string } };
      if (assetObj.guid?.toString) {
        this.guid = assetObj.guid.toString() as AssetGUIDType;
      }
      const Constructor = (asset as { constructor?: { assetType?: string; displayName?: string; name?: string } }).constructor;
      const newAssetType = Constructor?.assetType || Constructor?.name || '';
      if ((!this.assetType || this.assetType === '') && newAssetType && newAssetType !== 'Unknown') {
        (this as { assetType: AssetType }).assetType = newAssetType as AssetType;
      }
      const displayNameValue = Constructor?.displayName || '';
      if (displayNameValue) {
        this.displayName = displayNameValue;
      }
    }
  }

  static fromGuid<T = unknown>(guid: string, assetType: AssetType, displayName?: string): AssetResourceEntry<T> {
    const entry = new AssetResourceEntry<T>(assetType);
    entry.guid = guid as AssetGUIDType;
    if (displayName) {
      entry.displayName = displayName;
    }
    return entry;
  }
}
