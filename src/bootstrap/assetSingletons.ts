import { TypeRegistry } from '@ocentra/game-asset-domain/TypeRegistry';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';
import { assetConstructorLoaders } from '@/lib/core/registry/assetConstructorLoaders.generated';
import { initEntryIndexEventAdapter } from '@/adapters/assets/EntryIndexEventAdapter';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import { AssetLoader } from '@/adapters/assets/AssetLoader';

TypeRegistry.configure({ assetTypeMap, assetConstructorLoaders });
initEntryIndexEventAdapter();
Resources.setLoader(AssetLoader.getInstance());
