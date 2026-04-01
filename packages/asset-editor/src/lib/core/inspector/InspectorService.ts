import React from 'react';
import type { InspectorComponent } from './types';
import { inspectorMap, type InspectorTypeName } from '@/lib/core/registry/inspectorMap.generated';
import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_INSPECTOR_SERVICE = false;

const inspectors = new Map<string, InspectorComponent<unknown>>();
const loadingPromises = new Map<string, Promise<InspectorComponent<unknown> | undefined>>();
const inspectorModuleLoaders: Record<string, () => Promise<unknown>> = {
  ...import.meta.glob('/src/lib/assets/**/*Inspector.ts'),
  ...import.meta.glob('/src/lib/assets/**/*Inspector.tsx'),
  ...import.meta.glob('/src/lib/core/inspector/components/*Inspector.ts'),
  ...import.meta.glob('/src/lib/core/inspector/components/*Inspector.tsx'),
};

function resolveInspectorModulePath(inspectorPath: string): string | null {
  if (!inspectorPath.startsWith('@/')) {
    return null;
  }
  const normalized = inspectorPath.replace('@/', '/src/');
  const candidates = [
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
  ];
  for (const candidate of candidates) {
    if (candidate in inspectorModuleLoaders) {
      return candidate;
    }
  }
  return null;
}

export class InspectorService {
  private static preloadPromise: Promise<void> | null = null;


  static getAssetTypeName(constructor: new () => unknown): string {
    const rawAssetType = constructor.name;
    return normalizeAssetType(rawAssetType);
  }

  static async preloadAllInspectors(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = (async () => {
      const inspectorTypes = Object.keys(inspectorMap) as InspectorTypeName[];
      
      const loadPromises = inspectorTypes.map(async (inspectorTypeName) => {
        try {
          const inspectorPath = inspectorMap[inspectorTypeName];
          if (!inspectorPath) {
            return;
          }
          const modulePath = resolveInspectorModulePath(inspectorPath);
          if (!modulePath) {
            return;
          }
          const loader = inspectorModuleLoaders[modulePath];
          const module = await loader();
          const inspectorName = `${inspectorTypeName}Inspector`;
          const moduleRecord = module as Record<string, unknown>;
          const component = moduleRecord[inspectorName] || moduleRecord.default;
          
          if (component && this.isValidComponent(component)) {
            inspectors.set(inspectorTypeName, component as InspectorComponent<unknown>);
          }
        } catch (error) {
          log.logWarn(`[InspectorService] Failed to preload inspector for ${inspectorTypeName}`, getStackTrace(), error, LOG_INSPECTOR_SERVICE);
        }
      });

      await Promise.all(loadPromises);
    })();

    return this.preloadPromise;
  }

  static async getInspector<T>(constructor: new () => T): Promise<InspectorComponent<T> | undefined> {
    const assetTypeName = this.getAssetTypeName(constructor);
    return this.getInspectorByTypeName<T>(assetTypeName);
  }
    
  static async getInspectorByTypeName<T>(assetTypeName: string): Promise<InspectorComponent<T> | undefined> {
    if (inspectors.has(assetTypeName)) {
      return inspectors.get(assetTypeName) as InspectorComponent<T>;
    }

    if (loadingPromises.has(assetTypeName)) {
      return await loadingPromises.get(assetTypeName) as InspectorComponent<T> | undefined;
    }

    const inspectorPath = assetTypeName in inspectorMap 
      ? inspectorMap[assetTypeName as InspectorTypeName]
      : undefined;
    if (!inspectorPath) {
      log.logWarn(`[InspectorService] No inspector path found for assetType: "${assetTypeName}"`, getStackTrace(), {
        assetTypeName,
        availableKeys: Object.keys(inspectorMap)
      }, LOG_INSPECTOR_SERVICE);
      return undefined;
    }

    log.logInfo(`[InspectorService] Loading inspector for "${assetTypeName}"`, getStackTrace(), {
      assetTypeName,
      inspectorPath
    }, LOG_INSPECTOR_SERVICE);

    const loadPromise = (async () => {
      try {
        const modulePath = resolveInspectorModulePath(inspectorPath);
        if (!modulePath) {
          log.logWarn(`[InspectorService] No module loader found for "${assetTypeName}"`, getStackTrace(), {
            assetTypeName,
            inspectorPath,
          });
          return undefined;
        }
        const loader = inspectorModuleLoaders[modulePath];
        const module = await loader();
        const inspectorName = `${assetTypeName}Inspector`;
        const moduleRecord = module as Record<string, unknown>;
        const component = moduleRecord[inspectorName] || moduleRecord.default;
        if (component && this.isValidComponent(component)) {
          inspectors.set(assetTypeName, component as InspectorComponent<unknown>);
          return component as InspectorComponent<unknown>;
        }
      } catch (error) {
        log.logError(`[InspectorService] Failed to load inspector for ${assetTypeName}`, getStackTrace(), {
          assetTypeName,
          inspectorPath,
          error
        });
        return undefined;
      }
      return undefined;
    })() as Promise<InspectorComponent<unknown> | undefined>;

    loadingPromises.set(assetTypeName, loadPromise);
    const result = await loadPromise;
    loadingPromises.delete(assetTypeName);
    
    return result as InspectorComponent<T> | undefined;
  }

  private static isValidComponent(component: unknown): boolean {
    if (typeof component !== 'function') {
      return false;
    }

    const isClassConstructor = typeof component === 'function' && (
      component.toString().startsWith('class ') ||
      (component.prototype &&
       component.prototype.constructor === component &&
       typeof component.prototype.constructor === 'function' &&
       Object.getOwnPropertyNames(component.prototype).length > 1)
    );

    if (isClassConstructor) {
      return false;
    }

    if (typeof component === 'function' && component.prototype && component.prototype.constructor === component) {
      return false;
    }

    return true;
  }

  static hasInspector<T>(constructor: new () => T): boolean {
    const assetTypeName = this.getAssetTypeName(constructor);
    return inspectors.has(assetTypeName) || (assetTypeName in inspectorMap);
  }

  static hasInspectorByTypeName(assetTypeName: string): boolean {
    const normalizedName = normalizeAssetType(assetTypeName);
    const hasInCache = inspectors.has(normalizedName);
    const hasInMap = normalizedName in inspectorMap;
    const result = hasInCache || hasInMap;
    
    log.logInfo(`[InspectorService] hasInspectorByTypeName check`, getStackTrace(), {
      assetTypeName,
      normalizedName,
      hasInCache,
      hasInMap,
      result,
      availableInMap: normalizedName in inspectorMap ? inspectorMap[normalizedName as InspectorTypeName] : 'NOT_FOUND'
    }, LOG_INSPECTOR_SERVICE);
    
    return result;
  }

  static async resolveInspectorComponent<T>({
    assetType,
    data,
    ...props
  }: {
    assetType: string;
    data: T;
    index?: number;
    onNavigateToAsset?: (identifier: AssetIdentifier) => void;
    onFieldChange?: (field: string, value: unknown) => void;
    prefix?: string;
    immutable?: boolean;
    onCreateAsset?: (folderPath?: string, options?: unknown) => void;
    onDeleteGameMode?: (guid: string) => void;
  }): Promise<React.ReactElement | null> {
    const InspectorComponent = await this.getInspectorByTypeName<T>(assetType);

    if (!InspectorComponent) {
      return null;
    }

    if (typeof InspectorComponent !== 'function') {
      return null;
    }

    const componentStr = InspectorComponent.toString();
    const isClassLike = componentStr.startsWith('class ') || 
      componentStr.includes('_classCallCheck') ||
      (InspectorComponent.prototype &&
       InspectorComponent.prototype.constructor === InspectorComponent &&
       !InspectorComponent.prototype.isReactComponent &&
       Object.getOwnPropertyNames(InspectorComponent.prototype).length > 1);

    if (isClassLike) {
      return null;
    }

    const Component = InspectorComponent as React.FC<{ data: T; [key: string]: unknown }>;
    return React.createElement(Component, { data, ...props });
  }
}
