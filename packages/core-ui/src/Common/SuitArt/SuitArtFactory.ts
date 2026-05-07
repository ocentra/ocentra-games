import React from 'react';
import { SuitCard, SuitIcon } from './SuitArt';
import {
  ICON_DEFAULTS,
  getSuitCardProps,
  getSuitIconProps,
  type Suit,
  type SuitCardDefaults,
  type SuitIconDefaults,
  type Variant,
} from './SuitArtPrimitives';

export function getSuitIcon(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  overrides: Partial<SuitIconDefaults> = {}
) {
  return React.createElement(SuitIcon, getSuitIconProps(suit, variant, overrides));
}

export function getSuitCard(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  iconOverrides: Partial<SuitIconDefaults> = {},
  cardOverrides: Partial<SuitCardDefaults> = {}
) {
  return React.createElement(SuitCard, getSuitCardProps(suit, variant, iconOverrides, cardOverrides));
}
