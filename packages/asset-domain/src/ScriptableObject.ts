import type { ISaveAsset } from '@/ISaveAsset';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { AssetGUID } from '@/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { IsTypeOfEvent } from '@ocentra/eventing-domain/events/assets/IsTypeOfEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import { GetAssetConstructorEvent, type AssetClass } from '@ocentra/eventing-domain/events/assets/GetAssetConstructorEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { AssetResourceEntry } from '@/resourceEntry/AssetResourceEntry';
import { AssetResourceEntryFactory } from '@/resourceEntry/AssetResourceEntryFactory';
import type { ResourceEntry } from '@/resourceEntry/ResourceEntry';
import { MimeTypes, type AssetCategory } from '@/constants/assets';
import { getSerializableClassMetadata, getRequiredFields, required, type SerializableConstructor } from '@/serialization/decorators';
import { isAssetGUID } from '@/types/assetIdentifier';
import type { AssetGUIDType } from '@/types/assetIdentifier';
import type { ValidationResult, ValidationError } from '@/validation/types';
import { validateRuntimeAssetFile } from '@/validation/runtimeAssetValidator';
import type { AssetEntry } from '@ocentra/network-domain/router-types';
import { AssetTypeCategory } from '@/constants/assets';
import { normalizeAssetType } from '@/utils/assetTypeUtils';
import { parseJson5Asset, extractGuid as extractGuidFromContent, extractAssetType as extractAssetTypeFromContent } from '@/serialization/AssetMetadata';
import { serializeAsset, deserializeAsset, type SerializeAssetInstance } from '@/serialization/AssetSerializer';
import { getAssetLoader } from '@/loader/assetLoaderContext';

const log = MainAppLogger.instance;

log.register(import.meta.url);

const LOG_CONSTRUCTOR_WARNINGS = false;
const LOG_GUID_OPERATIONS = false;
const LOG_SAVE_OPERATIONS = false;
const LOG_LOAD_BY_GUID = false;
const LOG_LOAD_BY_TYPE = true;
const LOG_TYPE_CHECKING = false;
const LOG_COMING_SOON_FIRST_OR_DEFAULT = false;

const logInfo = (message: string, data?: unknown, enabled: boolean = false) => {
  if (enabled) {
    log.logInfo(message, getStackTrace(), data);
  }
};

const logWarn = (message: string, data?: unknown, enabled: boolean = false) => {
  if (enabled) {
    log.logWarn(message, getStackTrace(), data);
  }
};

const logError = (message: string, data?: unknown, enabled: boolean = true) => {
  if (enabled) {
    log.logError(message, getStackTrace(), data);
  }
};

const createdAssetsCache = new Map<string, { asset: ScriptableObject; timestamp: number }>();

export abstract class ScriptableObject extends ReactBehaviour implements ISaveAsset {
  private guidValue: AssetGUID | null = null;
  private guidLocked: boolean = false;

  displayName?: string;
  category?: AssetCategory;
  variant?: string;

  @required('Tree Path is required')
  treePath: string = '';

  static schemaVersion?: number;
  static executionOrder: number = 0;

  static assetType?: string;
  static displayName?: string;
  static icon?: string;
  static category?: AssetCategory;
  static createTemplate?(): Record<string, unknown>;

  constructor() {
    super();

    this.guidValue = null;
    this.guidLocked = false;
    this.treePath = '';

    if ((import.meta as { env?: { DEV?: boolean } })?.env?.DEV) {
      const Constructor = this.constructor as typeof ScriptableObject & {
        displayName?: string;
      };

      if (!Constructor.displayName) {
        logWarn(`[Contract Suggestion] ${Constructor.name} should define static displayName for better UI display`, undefined, LOG_CONSTRUCTOR_WARNINGS);
      }
    }
  }

  protected awake(): void { }

  protected onLoad(): void { }

  protected onValidate(): boolean {
    const result = this.getValidationErrors();
    return result.isValid;
  }

  getValidationErrors(): ValidationResult {
    const requiredValidation = this.validateRequiredFields();
    const schemaValidation = this.validateSchema();

    return {
      isValid: requiredValidation.isValid && schemaValidation.isValid,
      errors: [...requiredValidation.errors, ...schemaValidation.errors],
      warnings: [...requiredValidation.warnings, ...schemaValidation.warnings],
    };
  }

  private validateRequiredFields(): ValidationResult {
    const requiredFields = getRequiredFields(this.constructor as SerializableConstructor);
    const errors: ValidationError[] = [];

    for (const fieldMeta of requiredFields) {
      const value = (this as Record<string, unknown>)[fieldMeta.key];

      if (value === null || value === undefined) {
        const message = fieldMeta.message || `${fieldMeta.key} is required but not set`;

        errors.push({
          field: fieldMeta.key,
          message,
          severity: 'error',
        });

        logError(
          `Validation failed for ${this.constructor.name}.${fieldMeta.key}: ${message}`,
          {
            data: {
              assetType: this.constructor.name,
              guid: this.guid?.toString(),
              field: fieldMeta.key,
            }
          },
          true
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  toAssetFileObject(): Record<string, unknown> {
    return parseJson5Asset(this.serialize());
  }

  toDataObject(): Record<string, unknown> {
    const assetFile = this.toAssetFileObject();
    const { data } = assetFile;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    return data as Record<string, unknown>;
  }

  private validateSchema(): ValidationResult {
    try {
      return validateRuntimeAssetFile(this.toAssetFileObject());
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'asset',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  protected onBeforeSave(): void { }

  protected onAfterSave(): void { }

  protected onBeforeSync(): void { }

  protected onAfterSync(): void { }

  get guid(): AssetGUID {
    if (!this.guidValue) {
      this.guidValue = AssetGUID.create();
      this.guidLocked = false;
      const deferred = new OperationDeferred<string>();
      EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred)).then(() => {
        deferred.promise.then(result => {
          if (result.isSuccess && result.value && this.guidValue && !this.guidLocked && this.guidValue.toString() !== result.value) {
            this.guidValue = AssetGUID.from(result.value);
          }
        });
      });
    }
    return this.guidValue;
  }

  set guid(value: AssetGUID | string) {
    const guidValue = value instanceof AssetGUID ? value : AssetGUID.from(value);
    if (this.guidLocked) {
      if (this.guidValue && !this.guidValue.equals(guidValue)) {
        logWarn(
          `Attempted to change locked GUID from ${this.guidValue.toString()} to ${guidValue.toString()} - GUID is immutable.`,
          undefined,
          LOG_GUID_OPERATIONS
        );
      }
      return;
    }
    this.guidValue = guidValue;
    this.guidLocked = true;
  }

  private setGuidFromDeserialization(value: AssetGUID | string): void {
    const guidValue = value instanceof AssetGUID ? value : AssetGUID.from(value);

    if (this.guidValue && !this.guidValue.equals(guidValue)) {
      logInfo(
        `Overwriting GUID ${this.guidValue.toString()} with file GUID ${guidValue.toString()} during deserialization`,
        undefined,
        LOG_GUID_OPERATIONS
      );
    }

    this.guidValue = guidValue;
    this.guidLocked = true;
  }

  static async isTypeOf(
    assetType: string,
    typeToCheck: string | typeof ScriptableObject
  ): Promise<boolean> {
    try {
      const deferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new IsTypeOfEvent(assetType, typeToCheck, deferred));
      const result = await deferred.promise;

      if (!result.isSuccess) {
        return false;
      }

      return result.value ?? false;
    } catch (error) {
      logError('Failed to check if asset type matches type', {
        assetType,
        typeToCheck: typeof typeToCheck === 'string' ? typeToCheck : typeToCheck.name,
        error,
      }, LOG_TYPE_CHECKING);
      return false;
    }
  }

  serialize(): string {
    return serializeAsset(this as unknown as SerializeAssetInstance);
  }

  static deserialize<T>(
    constructor: new () => T,
    input: string | Record<string, unknown>
  ): T {
    return deserializeAsset(constructor, input);
  }

  static extractGuid(content: string): string | null {
    return extractGuidFromContent(content);
  }

  static extractAssetType(content: string): string | null {
    return extractAssetTypeFromContent(content);
  }

  async saveChanges(): Promise<void> {
    try {
      this.onBeforeSave();

      if (!this.onValidate()) {
        const validationResult = this.getValidationErrors();
        const errorMessages = validationResult.errors.map(e => `  - ${e.field}: ${e.message}`).join('\n');
        const fullMessage = `Asset validation failed:\n${errorMessages}`;

        throw new Error(fullMessage);
      }

      if (!this.guidLocked) {
        this.guidLocked = true;
      }

      const json5Content = this.serialize();
      const guidString = this.guid.toString();

      const Constructor = this.constructor as typeof ScriptableObject & {
        assetType?: string;
        category?: AssetCategory;
        ASSET_PATH?: string;
      };
      const classMetadata = getSerializableClassMetadata(Constructor as unknown as SerializableConstructor);
      const displayName = this.displayName ?? classMetadata?.displayName ?? Constructor.displayName ?? Constructor.name;
      const category = this.category ?? classMetadata?.category ?? Constructor.category ?? AssetTypeCategory.Content;
      const normalizedAssetType = normalizeAssetType(classMetadata?.assetType ?? Constructor.assetType ?? Constructor.name);
      const fileSize = json5Content.length;

      const uploadDeferred = new OperationDeferred<AssetEntry>();
      await EventBus.instance.publishAsync(new UploadAssetEvent(
        guidString,
        json5Content,
        {
          assetType: normalizedAssetType,
          displayName,
          category,
          mimeType: MimeTypes.Json,
          fileSize
        },
        uploadDeferred
      ));

      const uploadResult = await uploadDeferred.promise;
      if (!uploadResult.isSuccess) {
        const fullErrorMessage = `Failed to save asset: ${uploadResult.errorMessage || 'Unknown error'}`;
        logError(fullErrorMessage, {
          data: {
            guidString,
            normalizedAssetType,
            errorMessage: uploadResult.errorMessage,
          },
        });
        throw new Error(fullErrorMessage);
      }

      this.onAfterSave();

      if (!uploadResult.value) {
        throw new Error('Server did not return asset entry data');
      }

      const entry = AssetResourceEntryFactory.fromAssetEntry(uploadResult.value, this);

      const registerDeferred = new OperationDeferred<boolean>();
      const registerResult = await EventBus.instance.publishAsync(new RegisterIResourceEntryEvent(entry, registerDeferred));
      if (registerResult.isSuccess) {
        await registerDeferred.promise;
      }

      logInfo(`Saved asset with GUID: ${guidString}`, undefined, LOG_SAVE_OPERATIONS);

      (this as ScriptableObject & { __lastSavedEntry?: AssetResourceEntry }).__lastSavedEntry = entry;

      createdAssetsCache.set(guidString, { asset: this, timestamp: Date.now() });

      setTimeout(() => {
        createdAssetsCache.delete(guidString);
      }, 5000);
    } catch (error) {
      logError('Failed to save changes:', { data: error }, LOG_SAVE_OPERATIONS);
      throw error;
    }
  }

  static async loadByGuid<T extends ScriptableObject>(
    constructor: new () => T,
    guid: AssetGUID | string
  ): Promise<T | null> {
    const guidString = guid instanceof AssetGUID ? guid.toString() : guid;

    if (!isAssetGUID(guidString)) {
      logError(`Invalid GUID format: ${guidString}`, undefined, LOG_LOAD_BY_GUID);
      return null;
    }

    const cached = createdAssetsCache.get(guidString);
    if (cached && cached.asset instanceof constructor) {
      return cached.asset as T;
    }

    const loader = getAssetLoader();
    if (loader) {
      try {
        const instance = await loader.loadByGuid(constructor, guidString);
        if (!instance || !(instance instanceof ScriptableObject)) {
          return null;
        }
        const typedInstance = instance as T;
        const guidToSet = typedInstance.guid ? typedInstance.guid.toString() : guidString;
        typedInstance.setGuidFromDeserialization(AssetGUID.from(guidToSet));
        typedInstance.__initialize();
        typedInstance.onLoad();
        typedInstance.start();
        return typedInstance;
      } catch (error) {
        logError(`Failed to load asset by GUID ${guidString}:`, {
          data: {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        }, LOG_LOAD_BY_GUID);
        return null;
      }
    }

    try {
      const getResourceDeferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent(
        { guid: guidString as AssetGUIDType },
        getResourceDeferred
      ));

      const getResourceResult = await getResourceDeferred.promise;
      if (!getResourceResult.isSuccess || !getResourceResult.value) {
        logWarn(`Asset not found for GUID: ${guidString}`, {
          data: {
            errorMessage: getResourceResult.errorMessage,
          },
        }, LOG_LOAD_BY_GUID);
        return null;
      }

      const response = getResourceResult.value;

      if (!response.ok) {
        logWarn(`Asset not found for GUID: ${guidString}`, {
          data: {
            status: response.status,
            statusText: response.statusText,
          },
        }, LOG_LOAD_BY_GUID);
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        logWarn(`Got HTML instead of asset for GUID: ${guidString}`, undefined, LOG_LOAD_BY_GUID);
        return null;
      }

      const text = await response.text();

      let instance: T;
      try {
        instance = ScriptableObject.deserialize(constructor, text);
      } catch (deserializeError) {
        logError(`Failed to deserialize asset for GUID ${guidString}:`, {
          data: {
            error: deserializeError,
          },
        }, LOG_LOAD_BY_GUID);
        return null;
      }

      const extractedGuid = ScriptableObject.extractGuid(text);
      let loadedGuidString: string | undefined = extractedGuid || undefined;

      if (!loadedGuidString && instance.guid) {
        loadedGuidString = instance.guid.toString();
        logInfo(`Using GUID from deserialized instance: ${guidString}`, undefined, LOG_LOAD_BY_GUID);
      }

      if (loadedGuidString) {
        const loadedGuid = AssetGUID.from(loadedGuidString);
        instance.setGuidFromDeserialization(loadedGuid);
      } else {
        const generatedGuid = instance.guid;
        logWarn(`Asset with GUID ${guidString} missing GUID in JSON5 data. Auto-generated: ${generatedGuid.toString()}`, undefined, LOG_LOAD_BY_GUID);
      }

      instance.__initialize();
      instance.onLoad();
      instance.start();

      return instance;
    } catch (error) {
      logError(`Failed to load asset by GUID ${guidString}:`, {
        data: {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      }, LOG_LOAD_BY_GUID);
      return null;
    }
  }

  async loadNestedAssets(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const [key, value] of Object.entries(this)) {
      if (this.isAssetResourceEntry(value)) {
        const loadPromise = this.loadAndAssignAsset(key, value as Record<string, unknown>);
        loadPromises.push(loadPromise);
      }
    }

    await Promise.all(loadPromises);
    this.onNestedAssetsLoaded();
  }

  private static async readAssetJsonForDTO(guid: string): Promise<{ system: Record<string, unknown>; data: Record<string, unknown> } | null> {
    try {
      const assetCache = await import('@ocentra/storage-domain/caches/AssetCacheService').then(m => m.AssetCache.getInstance());
      await assetCache.initialize();
      const cached = await assetCache.getCachedAssetByGuid(guid);
      if (cached) {
        const parsed = parseJson5Asset(cached.content);
        if (parsed.system && parsed.data && typeof parsed.system === 'object' && typeof parsed.data === 'object') {
          return { system: parsed.system as Record<string, unknown>, data: parsed.data as Record<string, unknown> };
        }
      }

      const getResourceDeferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent({ guid: guid as AssetGUIDType }, getResourceDeferred));
      const getResourceResult = await getResourceDeferred.promise;

      if (!getResourceResult.isSuccess || !getResourceResult.value) {
        return null;
      }

      const response = getResourceResult.value;
      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        return null;
      }

      const text = await response.text();
      const parsed = parseJson5Asset(text);
      if (parsed.system && parsed.data && typeof parsed.system === 'object' && typeof parsed.data === 'object') {
        return { system: parsed.system as Record<string, unknown>, data: parsed.data as Record<string, unknown> };
      }

      return null;
    } catch (error) {
      logError(`Error reading asset JSON for DTO: ${guid}`, { data: error });
      return null;
    }
  }

  async readNestedAssetData(entries: (AssetResourceEntry | null | undefined)[]): Promise<void> {
    const entriesToLoad = entries
      .filter((entry): entry is AssetResourceEntry => entry instanceof AssetResourceEntry)
      .filter(entry => entry.guid && !entry.parsedData);

    const loadPromises = entriesToLoad.map(entry =>
      ScriptableObject.readAssetJsonForDTO(entry.guid).then(parsedData => {
        if (parsedData) {
          entry.parsedData = parsedData;
        }
      })
    );

    await Promise.all(loadPromises);
  }

  private async loadAndAssignAsset(propertyKey: string, entry: Record<string, unknown>): Promise<void> {
    const guid = entry.guid as string;
    const type = (entry.assetType ?? entry.type) as string;

    if (!guid || !type) {
      logWarn(`AssetResourceEntry missing guid or type`, { propertyKey, guid, type });
      return;
    }

    try {
      const constructorDeferred = new OperationDeferred<AssetClass | null>();
      await EventBus.instance.publishAsync(new GetAssetConstructorEvent(type, constructorDeferred));
      const constructorResult = await constructorDeferred.promise;

      if (!constructorResult.isSuccess || !constructorResult.value) {
        logWarn(`Could not get constructor for type: ${type}`, { propertyKey, guid, type });
        return;
      }

      const constructor = constructorResult.value;
      const asset = await ScriptableObject.loadByGuid(constructor as new () => ScriptableObject, guid);

      if (asset) {
        (this as Record<string, unknown>)[propertyKey] = asset;
      } else {
        logWarn(`Failed to load asset by GUID`, { propertyKey, guid, type });
      }
    } catch (error) {
      logError(`Error loading nested asset for ${propertyKey}:`, { data: error });
    }
  }

  private isAssetResourceEntry(value: unknown): boolean {
    if (value instanceof AssetResourceEntry) {
      return true;
    }
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const record = value as Record<string, unknown>;
    const resourceEntryType = record.resourceEntryType ?? record.resourceType;
    return resourceEntryType === 'AssetResourceEntry' && 'guid' in record && ('assetType' in record || 'type' in record);
  }

  onNestedAssetsLoaded(): void {
  }

  static async FirstOrDefault<T extends ScriptableObject>(
    constructor: new () => T,
    displayNameOrVariant?: string,
    variant?: string
  ): Promise<T | null> {
    const classMetadata = getSerializableClassMetadata(constructor);
    const constructorWithStatics = constructor as unknown as typeof ScriptableObject & {
      assetType?: string;
    };
    const assetType = classMetadata?.assetType ?? constructorWithStatics.assetType;

    if (!assetType) {
      logError(`Cannot determine assetType for ${constructor.name}. Ensure @serializableClass decorator has assetType or static assetType property is set.`, undefined, LOG_TYPE_CHECKING);
      return null;
    }

    if (variant || displayNameOrVariant) {
      try {
        const findDeferred = new OperationDeferred<ResourceEntry | null>();
        await EventBus.instance.publishAsync(new FindAssetByTypeAndNameEvent(assetType, displayNameOrVariant, findDeferred, variant));
        const findResult = await findDeferred.promise;

        if (!findResult.isSuccess || !findResult.value) {
          const identifier = variant || displayNameOrVariant || 'unknown';
          logWarn(`Asset not found for type: ${assetType}, ${variant ? 'variant' : 'displayName'}: ${identifier}, falling back to first of type`, {
            data: {
              errorMessage: findResult.errorMessage,
            },
          }, LOG_LOAD_BY_TYPE);

          const firstOfType = await ScriptableObject.FirstOrDefault(constructor);
          if (firstOfType) {
            return firstOfType;
          }

          return null;
        }

        const entry = findResult.value as AssetResourceEntry;
        if (!entry.guid) {
          const identifier = variant || displayNameOrVariant || 'unknown';
          logWarn(`Asset entry found but missing GUID for type: ${assetType}, ${variant ? 'variant' : 'displayName'}: ${identifier}`, undefined, LOG_LOAD_BY_TYPE);
          return null;
        }

        return await ScriptableObject.loadByGuid(constructor, AssetGUID.from(entry.guid));
      } catch (error) {
        const identifier = variant || displayNameOrVariant || 'unknown';
        logError(`Failed to load asset by type and ${variant ? 'variant' : 'displayName'} ${assetType}/${identifier}:`, {
          data: {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        }, LOG_LOAD_BY_TYPE);
        return null;
      }
    }

    try {
      const getResourceDeferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent(
        { assetType },
        getResourceDeferred
      ));

      const getResourceResult = await getResourceDeferred.promise;
      if (!getResourceResult.isSuccess || !getResourceResult.value) {
        logWarn(`Asset not found for type: ${assetType}`, {
          data: {
            errorMessage: getResourceResult.errorMessage,
          },
        }, LOG_LOAD_BY_TYPE);
        return null;
      }

      const response = getResourceResult.value;

      if (!response.ok) {
        logWarn(`Asset not found for type: ${assetType}`, {
          data: {
            status: response.status,
            statusText: response.statusText,
          },
        }, LOG_LOAD_BY_TYPE);
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        logWarn(`Got HTML instead of asset for type: ${assetType}`, undefined, LOG_LOAD_BY_TYPE);
        return null;
      }

      const text = await response.text();

      if (assetType === 'ComingSoon') {
        logInfo(`[FIRST_OR_DEFAULT] Got ComingSoon asset text, length: ${text.length}`, {
          data: {
            preview: text.substring(0, 500),
          },
        }, LOG_COMING_SOON_FIRST_OR_DEFAULT);
      }

      let instance: T;
      try {
        instance = ScriptableObject.deserialize(constructor, text);

        if (assetType === 'ComingSoon') {
          logInfo(`[FIRST_OR_DEFAULT] Deserialized ComingSoon instance:`, {
            data: {
              hasImages: !!(instance as unknown as { images?: unknown[] }).images,
              imagesLength: Array.isArray((instance as unknown as { images?: unknown[] }).images)
                ? ((instance as unknown as { images: unknown[] }).images.length)
                : 'N/A',
              images: (instance as unknown as { images?: unknown[] }).images,
            },
          }, LOG_COMING_SOON_FIRST_OR_DEFAULT);
        }
      } catch (deserializeError) {
        logError(`Failed to deserialize asset for type ${assetType}:`, {
          data: {
            error: deserializeError,
          },
        }, LOG_LOAD_BY_TYPE);
        return null;
      }

      const extractedGuid = ScriptableObject.extractGuid(text);
      let loadedGuidString: string | undefined = extractedGuid || undefined;

      if (!loadedGuidString && instance.guid) {
        loadedGuidString = instance.guid.toString();
        logInfo(`Using GUID from deserialized instance: ${loadedGuidString}`, undefined, LOG_LOAD_BY_TYPE);
      }

      if (loadedGuidString) {
        const loadedGuid = AssetGUID.from(loadedGuidString);
        instance.setGuidFromDeserialization(loadedGuid);
      } else {
        const generatedGuid = instance.guid;
        logWarn(`Asset with type ${assetType} missing GUID in JSON5 data. Auto-generated: ${generatedGuid.toString()}`, undefined, LOG_LOAD_BY_TYPE);
      }

      instance.__initialize();
      instance.onLoad();
      instance.start();

      return instance;
    } catch (error) {
      logError(`Failed to load asset by type ${assetType}:`, {
        data: {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      }, LOG_LOAD_BY_TYPE);
      return null;
    }
  }

  static getDefaultDisplayName(constructor: new () => ScriptableObject): string {
    return `${constructor.name}Default`;
  }

  static async getOrCreateDefault<T extends ScriptableObject>(
    constructor: new () => T,
    defaultName: string,
    createDefaultInstance: () => T,
    defaultGuid?: string,
    _defaultPath?: string,
    defaultVariant?: string
  ): Promise<T> {
    const loaded = defaultVariant
      ? await ScriptableObject.FirstOrDefault(constructor, defaultName, defaultVariant)
      : await ScriptableObject.FirstOrDefault(constructor, defaultName);
    if (loaded) {
      return loaded;
    }

    const instance = createDefaultInstance();
    instance.displayName = defaultName;
    if (defaultVariant) {
      instance.variant = defaultVariant;
    }

    if (defaultGuid) {
      const guid = AssetGUID.from(defaultGuid);
      instance.setGuidFromDeserialization(guid);
    } else {
      const guidDeferred = new OperationDeferred<string>();
      await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(guidDeferred));
      const guidResult = await guidDeferred.promise;
      if (guidResult.isSuccess && guidResult.value) {
        const guid = AssetGUID.from(guidResult.value);
        instance.setGuidFromDeserialization(guid);
      }
    }

    instance.__initialize();
    instance.onLoad();
    instance.start();

    try {
      await instance.saveChanges();
      const classMetadata = getSerializableClassMetadata(constructor as unknown as SerializableConstructor);
      const constructorWithStatics = constructor as unknown as typeof ScriptableObject & {
        assetType?: string;
      };
      const assetType = classMetadata?.assetType ?? constructorWithStatics.assetType;
      logInfo(`[ScriptableObject] Created and saved default asset: ${defaultName}`, {
        assetType,
        displayName: defaultName,
        variant: defaultVariant,
        guid: instance.guid.toString(),
      }, LOG_LOAD_BY_TYPE);
    } catch (error) {
      logWarn(`[ScriptableObject] Failed to save default asset: ${defaultName}`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
      }, LOG_LOAD_BY_TYPE);
    }

    return instance;
  }
}
