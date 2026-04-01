import type { ComponentProps } from 'react';
import { ShopScreenShared } from '@/ui/features/shop/ShopScreen.shared';

type ShopScreenProps = ComponentProps<typeof ShopScreenShared>;

export function ShopScreenDesktop(props: ShopScreenProps) {
  return <ShopScreenShared {...props} />;
}
