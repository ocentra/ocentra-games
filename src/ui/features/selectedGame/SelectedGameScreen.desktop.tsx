import type { ComponentProps } from 'react';
import { SelectedGameScreenShared } from '@/ui/features/selectedGame/SelectedGameScreen.shared';

type SelectedGameScreenProps = ComponentProps<typeof SelectedGameScreenShared>;

export function SelectedGameScreenDesktop(props: SelectedGameScreenProps) {
  return <SelectedGameScreenShared {...props} />;
}
