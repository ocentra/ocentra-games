import type { ComponentProps } from 'react';
import { ShopScreenWeb } from '@/ui/features/shop/ShopScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type ShopScreenProps = ComponentProps<typeof ShopScreenWeb>;

export const ShopScreen = createPlatformScreen<ShopScreenProps>(
  ShopScreenWeb,
  () => import('@/ui/features/shop/ShopScreen.desktop').then((m) => ({ default: m.ShopScreenDesktop })),
  () => import('@/ui/features/shop/ShopScreen.mobile').then((m) => ({ default: m.ShopScreenMobile }))
);
