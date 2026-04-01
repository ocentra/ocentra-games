import type { ComponentProps } from 'react';
import { SelectedGameScreenShared } from '@/ui/features/selectedGame/SelectedGameScreen.shared';

type SelectedGameScreenProps = ComponentProps<typeof SelectedGameScreenShared>;

export function SelectedGameScreenMobile(props: SelectedGameScreenProps) {
  return <SelectedGameScreenShared {...props} />;
}
