import { useAsset } from './useAsset';
import { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';

export function useLayout(layoutGuid: string | null): CardGameLayout | null;

export function useLayout<T>(
  layoutGuid: string | null,
  layoutClass: new () => T
): T | null;

export function useLayout<T = CardGameLayout>(
  layoutGuid: string | null,
  layoutClass?: new () => T
): T | null {
  const constructor = (layoutClass ?? CardGameLayout) as unknown as new () => ScriptableObject;
  return useAsset(constructor, layoutGuid) as T | null;
}
