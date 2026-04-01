import type { ResourceRequest } from '@ocentra/network-domain/router-types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { PlatformAssetRequest } from '@/adapters/assets/PlatformAssetRuntime';
import { findFirstGuidByAssetType, getEntryIndex } from '@/adapters/assets/EntryIndexService';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_ASSET_TYPE_RESOLUTION = true;

export async function resolvePlatformAssetRequest(
  request: ResourceRequest
): Promise<PlatformAssetRequest> {
  if (request.guid || request.hash || request.checksum) {
    return {
      guid: request.guid,
      hash: request.hash,
      checksum: request.checksum,
    };
  }

  if (!request.assetType) {
    throw new Error('Cannot resolve asset request: no guid/hash/checksum/assetType');
  }

  const entryIndex = await getEntryIndex();
  if (!entryIndex) {
    log.logWarn('[RuntimeAssetResolver] assetType request but entry index unavailable', getStackTrace(), {
      assetType: request.assetType,
    }, LOG_ASSET_TYPE_RESOLUTION);
    throw new Error(`Cannot resolve assetType ${request.assetType}: entry index is null`);
  }

  const guid = await findFirstGuidByAssetType(request.assetType);
  if (!guid) {
    const types = [...new Set(entryIndex.resources.map((resource) => resource.assetType ?? '').filter(Boolean))];
    log.logWarn('[RuntimeAssetResolver] no resource found for assetType', getStackTrace(), {
      assetType: request.assetType,
      availableTypes: types.slice(0, 20),
    }, LOG_ASSET_TYPE_RESOLUTION);
    throw new Error(`No resource of type ${request.assetType} in entry index (available: ${types.slice(0, 10).join(', ')}...)`);
  }

  log.logInfo('[RuntimeAssetResolver] resolved assetType to guid', getStackTrace(), {
    assetType: request.assetType,
    guid,
  }, LOG_ASSET_TYPE_RESOLUTION);

  return { guid };
}
