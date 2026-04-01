import { ClaimGameScreenWeb } from '@/ui/features/claimGame/ClaimGameScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const ClaimGameScreen = createPlatformScreen<Record<string, never>>(
  ClaimGameScreenWeb,
  () => import('@/ui/features/claimGame/ClaimGameScreen.desktop').then((m) => ({ default: m.ClaimGameScreenDesktop })),
  () => import('@/ui/features/claimGame/ClaimGameScreen.mobile').then((m) => ({ default: m.ClaimGameScreenMobile }))
);
