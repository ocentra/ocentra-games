import type { SerializedUnifiedHeaderConfig } from '@ocentra/core-ui/Header/UnifiedHeader.config';

export const HEADER_PROFILE_CONTROLS_CHANNEL = 'ocentra:header-profile-controls';

export type HeaderProfileControlsMessage =
  | { type: 'request-state' }
  | { type: 'state'; config: SerializedUnifiedHeaderConfig | null }
  | { type: 'update'; config: SerializedUnifiedHeaderConfig };
