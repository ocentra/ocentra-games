import React, { useState, useEffect, useMemo } from 'react';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { isMultiline } from '../utils/fieldUtils';
import { getSerializableFields, getRequiredFields, type SerializableField, type SerializableConstructor } from '@ocentra/asset-domain/serialization/decorators';
import type { ValidationError } from '@ocentra/asset-domain/validation/types';
import { createInspectorLogger } from '@/lib/core/inspector/utils/logger';
import { ArrayInspector } from './ArrayInspector';
import { DictionaryInspector } from './DictionaryInspector';
import { InspectorGroup } from './InspectorGroup';
import { Field } from '@/lib/core/inspector/fields/Field';
import { SelectField } from '@/lib/core/inspector/fields/SelectField';
import { ImageUploadField } from '@/lib/core/inspector/fields/ImageUploadField';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import { MultilineField } from '@/lib/core/inspector/fields/MultilineField';


import type { CreateGameModeOptions } from '@/lib/core/inspector/types';
import type { AssetIdentifier, ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import './GenericInspector.css';

const { logWarn } = createInspectorLogger('GenericInspector');

function isAssetField(key: string): boolean {
  return key.endsWith('Asset') || key.endsWith('Assets') ||
         key.endsWith('Ref') || key.endsWith('Refs') ||
         key.toLowerCase().includes('asset') || key.toLowerCase().includes('ref');
}

interface GenericInspectorProps {
  data: unknown;
  assetType?: string;
  onFieldChange: (field: string, value: unknown) => void;
  excludeKeys?: string[];
  prefix?: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  onCreateAsset?: (folderPath?: string, options?: CreateGameModeOptions) => void;
  onDeleteGameMode?: (guid: string) => void;
  currentGameId?: string;
}

export const GenericInspector: React.FC<GenericInspectorProps> = ({
  data,
  assetType,
  onFieldChange,
  excludeKeys = [],
  prefix = '',
  onNavigateToAsset,
  onCreateAsset,
  onDeleteGameMode,
  currentGameId
}) => {
  const [fieldMetadata, setFieldMetadata] = useState<SerializableField[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());

  // Get required fields metadata
  const requiredFieldKeys = useMemo(() => {
    if (!data || typeof data !== 'object' || !('constructor' in data)) {
      return new Set<string>();
    }
    const constructor = data.constructor as SerializableConstructor;
    const required = getRequiredFields(constructor);
    return new Set(required.map(f => f.key));
  }, [data]);

  const [prevData, setPrevData] = useState(data);
  const [prevAssetType, setPrevAssetType] = useState(assetType);
  const [prevPrefix, setPrevPrefix] = useState(prefix);

  if (data !== prevData) {
    setPrevData(data);
    if (!data || typeof data !== 'object' || !('getValidationErrors' in data)) {
      setValidationErrors(new Map());
    } else {
      try {
        const result = (data as { getValidationErrors: () => { errors: ValidationError[] } }).getValidationErrors();
        const errorMap = new Map<string, string>();
        for (const error of result.errors) {
          errorMap.set(error.field, error.message);
        }
        setValidationErrors(errorMap);
      } catch {
        setValidationErrors(new Map());
      }
    }
  }

  if (assetType !== prevAssetType || prefix !== prevPrefix) {
    setPrevAssetType(assetType);
    setPrevPrefix(prefix);
    if (!assetType || prefix) {
      setFieldMetadata(null);
    }
  }


  useEffect(() => {
    if (!assetType || prefix) return;

    const loadFieldMetadata = async () => {
      const getAssetTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
      await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getAssetTypeInfoDeferred));
      const result = await getAssetTypeInfoDeferred.promise;
      const typeInfo = result.isSuccess ? result.value : null;
      if (!typeInfo) {
        setFieldMetadata(null);
        return;
      }

      try {
        const constructor = typeInfo.constructor;
        const constructorName = constructor && typeof constructor === 'function' ? constructor.name : undefined;
        if (!constructor || typeof constructor !== 'function') {
          logWarn('Invalid constructor in GenericInspector', {
            constructorType: typeof constructor,
            constructorName
          });
          setFieldMetadata(null);
          return;
        }
        const fields = getSerializableFields(constructor);
        setFieldMetadata(fields);
      } catch (error) {
        logWarn('Failed to get field metadata:', error);
        setFieldMetadata(null);
      }
    };

    loadFieldMetadata();
  }, [assetType, prefix]);


  if (data === null || data === undefined) {
    return <div className="inspector-panel__field-value-readonly">null</div>;
  }

  if (Array.isArray(data)) {
    return (
      <ArrayInspector
        label={prefix || 'Array'}
        data={data}
        onFieldChange={onFieldChange}
        prefix={prefix}
        onNavigateToAsset={onNavigateToAsset}
        onCreateAsset={onCreateAsset}
        onDeleteGameMode={onDeleteGameMode}
        currentGameId={currentGameId}
        isGameModesArray={prefix === 'gameModes'}
      />
    );
  }

  if (typeof data !== 'object') {
    return (
      <Field
        label={prefix || 'Value'}
        value={JSON.stringify(data)}
        onChange={(v) => {
          try {
            const parsed = JSON.parse(String(v));
            onFieldChange(prefix, parsed);
          } catch {
            onFieldChange(prefix, String(v));
          }
        }}
        isRequired={false}
        validationError={null}
      />
    );
  }

  const metadataMap = new Map<string, SerializableField>();
  if (fieldMetadata) {
    for (const field of fieldMetadata) {
      metadataMap.set(field.key, field);
    }
  }

  const renderField = (key: string, value: unknown, fieldMeta?: SerializableField): React.ReactNode => {
    if (excludeKeys.includes(key)) return null;

    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const field = fieldMeta || metadataMap.get(key);
    const fieldLabel = field?.options.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());


    if (Array.isArray(value) || (value && typeof value === 'object' && 'toArray' in value && typeof (value as { toArray: () => unknown[] }).toArray === 'function')) {
      const arrayValue = Array.isArray(value) ? value : (value as { toArray: () => unknown[] }).toArray();
      const isImmutable = field?.options.immutable === true || key === 'resources';
      return (
        <ArrayInspector
          key={key}
          label={fieldLabel}
          data={arrayValue}
          onFieldChange={onFieldChange}
          prefix={fieldPath}
          onNavigateToAsset={onNavigateToAsset}
          onCreateAsset={onCreateAsset}
          onDeleteGameMode={onDeleteGameMode}
          currentGameId={currentGameId}
          isGameModesArray={key === 'gameModes'}
          immutable={isImmutable}
        />
      );
    }

    if (typeof value === 'object' && value !== null) {

      if (key === 'guid' && '_value' in value && typeof (value as { _value?: unknown })._value === 'string') {
        return (
          <Field
            key={key}
            label={fieldLabel}
            value={(value as { _value: string })._value}
            readOnly
            isRequired={requiredFieldKeys.has(key)}
            validationError={validationErrors.get(key) || null}
          />
        );
      }

      const hasToRecord = typeof (value as { toRecord?: () => unknown }).toRecord === 'function';
      const hasToJSON = typeof (value as { toJSON?: () => unknown }).toJSON === 'function';
      const hasMapProperty = '_map' in value && typeof value === 'object' && value !== null;
      const isMapClass = hasToRecord || hasToJSON || hasMapProperty;

      const fieldForDict = fieldMeta || metadataMap.get(key);
      const isDictionary = !Array.isArray(value) &&
        (fieldForDict?.options.dictionaryType !== undefined || isMapClass) &&
        typeof value === 'object' &&
        value !== null &&
        !(value instanceof Date) &&
        !('assetRef' in value);

      if (isDictionary && typeof value === 'object') {
        let dictValue: Record<string, string>;
        let mapClass: { fromRecord?: (record: Record<string, string>) => unknown } | null = null;

        if (typeof (value as { toRecord?: () => Record<string, string> }).toRecord === 'function') {
          dictValue = (value as { toRecord: () => Record<string, string> }).toRecord();
          mapClass = value as { fromRecord?: (record: Record<string, string>) => unknown };
        } else if (typeof (value as { toJSON?: () => Record<string, string> }).toJSON === 'function') {
          dictValue = (value as { toJSON: () => Record<string, string> }).toJSON();
          mapClass = value as { fromRecord?: (record: Record<string, string>) => unknown };
        } else if ('_map' in value && typeof (value as { _map?: unknown })._map === 'object' && (value as { _map?: unknown })._map !== null) {
          const mapObj = (value as { _map: Record<string, string> | Map<string, string> })._map;
          if (mapObj instanceof Map) {
            dictValue = Object.fromEntries(mapObj);
          } else {
            dictValue = mapObj as Record<string, string>;
          }
        } else {
          dictValue = value as Record<string, string>;
        }

        const keyType = key.includes('Guid') || key.includes('guid') ? 'guid' :
          key.includes('Path') || key.includes('path') ? 'path' : 'string';
        const valueType = key.includes('Timestamp') || key.includes('timestamp') || key.includes('LastModified') || key.includes('lastModified') ? 'timestamp' :
          key.includes('Guid') || key.includes('guid') ? 'guid' :
            key.includes('Path') || key.includes('path') ? 'path' : 'string';

        const handleDictionaryChange = (field: string, newValue: unknown) => {
          if (mapClass && typeof mapClass.fromRecord === 'function') {
            const recordValue = newValue as Record<string, string>;
            const mapInstance = mapClass.fromRecord(recordValue);
            onFieldChange(field, mapInstance);
          } else {
            onFieldChange(field, newValue);
          }
        };

        return (
          <DictionaryInspector
            key={key}
            label={fieldLabel}
            data={dictValue}
            onFieldChange={handleDictionaryChange}
            prefix={fieldPath}
            keyLabel={keyType === 'guid' ? 'GUID' : keyType === 'path' ? 'Path' : 'Key'}
            valueLabel={valueType === 'timestamp' ? 'Timestamp' : valueType === 'guid' ? 'GUID' : valueType === 'path' ? 'Path' : 'Value'}
            keyType={keyType}
            valueType={valueType}
            onNavigateToAsset={onNavigateToAsset}
          />
        );
      }

      const assetRefObj = value as { assetRef?: boolean; guid?: string; type?: string };
      const isAssetFieldCheck = isAssetField(key);

      if (isAssetFieldCheck && typeof assetRefObj.guid === 'string' && AssetGUID.isValid(assetRefObj.guid)) {
        const expectedAssetType = assetRefObj.type ||
          (key.endsWith('Ref') || key.endsWith('Refs')
            ? key.replace(/Refs?$/, '').replace(/asset/gi, '').replace(/ref/gi, '')
            : key.replace(/Assets?$/, '').replace(/Refs?$/, '').replace(/asset/gi, '').replace(/ref/gi, '')) || undefined;

        return (
          <AssetGuidReferenceField
            key={key}
            label={fieldLabel}
            value={assetRefObj.guid}
            onChange={(newGuid) => {
              onFieldChange(fieldPath, assetRefObj.assetRef === true ? {
                assetRef: true,
                guid: newGuid,
                type: assetRefObj.type,
              } : {
                ...assetRefObj,
                guid: newGuid,
              });
            }}
            expectedAssetType={expectedAssetType}
            onNavigateToAsset={onNavigateToAsset}
            isRequired={requiredFieldKeys.has(key)}
            validationError={validationErrors.get(key) || null}
          />
        );
      }

      return (
        <div key={key} className="inspector-panel__nested-section">
          <div className="inspector-panel__section-header">{fieldLabel}</div>
          <GenericInspector
            data={value}
            assetType={assetType}
            onFieldChange={onFieldChange}
            excludeKeys={excludeKeys}
            prefix={fieldPath}
            onNavigateToAsset={onNavigateToAsset}
            onCreateAsset={onCreateAsset}
            onDeleteGameMode={onDeleteGameMode}
            currentGameId={currentGameId}
          />
        </div>
      );
    }

    if (typeof value === 'string' && AssetGUID.isValid(value)) {
      const isAssetFieldCheck = isAssetField(key);

      if (isAssetFieldCheck) {
        const expectedAssetType = key.replace(/Assets?$/, '').replace(/Refs?$/, '').replace(/asset/gi, '').replace(/ref/gi, '') || undefined;
        return (
          <AssetGuidReferenceField
            key={key}
            label={fieldLabel}
            value={value}
            onChange={(newValue) => onFieldChange(fieldPath, newValue)}
            expectedAssetType={expectedAssetType}
            onNavigateToAsset={onNavigateToAsset}
            isRequired={requiredFieldKeys.has(key)}
            validationError={validationErrors.get(key) || null}
          />
        );
      }
    }

    if (typeof value === 'string' && isMultiline(value, key)) {
      return (
        <MultilineField
          key={key}
          label={fieldLabel}
          value={value}
          onChange={(newValue) => onFieldChange(fieldPath, newValue)}
          readOnly={false}
        />
      );
    }

    if (key === 'releaseStatus' && typeof value === 'string') {
      const statusOptions = [
        { value: GameModeStatus.ComingSoon, label: 'Coming Soon' },
        { value: GameModeStatus.Available, label: 'Available' },
        { value: GameModeStatus.Maintenance, label: 'Maintenance' },
        { value: GameModeStatus.Deprecated, label: 'Deprecated' },
      ];
      return (
        <SelectField
          key={key}
          label={fieldLabel}
          value={value}
          onChange={(newValue) => onFieldChange(fieldPath, newValue)}
          options={statusOptions}
        />
      );
    }

    if (key === 'bannerImage' && typeof value === 'string') {
      const imageHash: ImageHash | null = isImageHash(value) ? value : null;
      return (
        <ImageUploadField
          key={key}
          label={fieldLabel}
          value={imageHash}
          onChange={(newValue) => onFieldChange(fieldPath, newValue)}
          fieldName={key}
        />
      );
    }

    return (
      <Field
        key={key}
        label={fieldLabel}
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : JSON.stringify(value)
        }
        onChange={(v) => {
          if (typeof value === 'number') {
            const num = Number(v);
            onFieldChange(fieldPath, isNaN(num) ? v : num);
          } else {
            onFieldChange(fieldPath, v);
          }
        }}
        onNavigateToAsset={onNavigateToAsset}
        isRequired={requiredFieldKeys.has(key)}
        validationError={validationErrors.get(key) || null}
      />
    );
  };

  if (fieldMetadata && !prefix) {
    const dataObj = data as Record<string, unknown>;
    const groups = new Map<string, Array<{
      key: string;
      label: string;
      value: unknown;
      fieldPath: string;
      component: React.ReactNode;
    }>>();

    const ungrouped: Array<{
      key: string;
      label: string;
      value: unknown;
      fieldPath: string;
      component: React.ReactNode;
    }> = [];

    if (fieldMetadata) {
      for (const field of fieldMetadata) {
        if (excludeKeys.includes(field.key)) continue;
        if (!field.key || field.key.trim() === '') continue;

        if (!(field.key in dataObj)) continue;

        const value = dataObj[field.key];
        if (value === undefined) continue;

        const component = renderField(field.key, value, field);

        if (!component) continue;

        const groupName = field.options.group || 'General';
        const safeKey = field.key || `field-${ungrouped.length + Array.from(groups.values()).flat().length}`;
        if (groupName === 'General') {
          ungrouped.push({
            key: safeKey,
            label: field.options.label || field.key || 'Unnamed Field',
            value,
            fieldPath: field.key,
            component,
          });
        } else {
          if (!groups.has(groupName)) {
            groups.set(groupName, []);
          }
          groups.get(groupName)!.push({
            key: safeKey,
            label: field.options.label || field.key || 'Unnamed Field',
            value,
            fieldPath: field.key,
            component,
          });
        }
      }
    }

    const dataKeys = new Set(Object.keys(dataObj));
    if (fieldMetadata) {
      for (const field of fieldMetadata) {
        dataKeys.delete(field.key);
      }
    }

    for (const key of dataKeys) {
      if (excludeKeys.includes(key)) continue;
      if (!key || key.trim() === '') continue;
      const value = dataObj[key];
      const component = renderField(key, value);
      if (component) {
        ungrouped.push({
          key: key || `unnamed-field-${ungrouped.length}`,
          label: key || 'Unnamed Field',
          value,
          fieldPath: key,
          component,
        });
      }
    }

    return (
      <>
        {Array.from(groups.entries()).map(([groupName, fields]) => (
          <InspectorGroup
            key={groupName}
            title={groupName}
            fields={fields}
            defaultExpanded={true}
          />
        ))}
        {ungrouped.length > 0 && (
          <InspectorGroup
            title="General"
            fields={ungrouped}
            defaultExpanded={true}
          />
        )}
      </>
    );
  }

  return (
    <>
      {Object.entries(data as Record<string, unknown>)
        .filter(([key]) => !excludeKeys.includes(key) && key && key.trim() !== '')
        .map(([key, value]) => renderField(key, value))
        .filter((item): item is React.ReactElement => item !== null)}
    </>
  );
};


