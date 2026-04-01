import type { ComponentProps } from 'react';
import { ShopPage } from '@/ui/pages/Shop/ShopPage';

type ShopScreenSharedProps = ComponentProps<typeof ShopPage>;

export function ShopScreenShared(props: ShopScreenSharedProps) {
  return <ShopPage {...props} />;
}
