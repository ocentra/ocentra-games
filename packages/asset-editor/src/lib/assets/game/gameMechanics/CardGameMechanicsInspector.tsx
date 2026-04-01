import React from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { GenericInspector } from '@/lib/core/inspector/components/GenericInspector';

export const CardGameMechanicsInspector: InspectorComponent<Record<string, unknown>> = ({
  data,
  onFieldChange,
  onNavigateToAsset,
  onCreateAsset,
  onDeleteGameMode,
}) => (
  <GenericInspector
    data={data}
    assetType="CardGameMechanics"
    onFieldChange={(field, value) => onFieldChange?.(field, value)}
    onNavigateToAsset={onNavigateToAsset}
    onCreateAsset={onCreateAsset}
    onDeleteGameMode={onDeleteGameMode}
  />
);
