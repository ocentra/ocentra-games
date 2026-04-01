import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';

export type ComponentType =
  | 'Button'
  | 'Input'
  | 'Card'
  | 'Modal'
  | 'Dialog'
  | 'Tooltip'
  | 'Badge'
  | 'Custom';

export interface ComponentStyles {
  [property: string]: string;
}

export interface AnimationConfig {
  name: string;
  duration?: string;
  timingFunction?: string;
  delay?: string;
  iterationCount?: string;
  direction?: string;
  fillMode?: string;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'UIComponent',
  displayName: 'UI Component',
  icon: '🎨',
  category: AssetTypeCategory.UI,
})
export class UIComponent extends ScriptableObject {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {
      component: 'Button',
      styles: {},
      animations: {},
    };
  }

  @serializable({ label: 'Component Type' })
  component: ComponentType = 'Button';

  @serializable({ label: 'Styles' })
  styles: ComponentStyles = {};

  @serializable({
    label: 'Animations',
    elementType: Object as unknown as new () => AnimationConfig
  })
  animations: Record<string, AnimationConfig> = {};
}
