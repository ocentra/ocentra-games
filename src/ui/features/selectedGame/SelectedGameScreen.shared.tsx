import type { ComponentProps } from 'react';
import { SelectedGamePage } from '@/ui/pages/games/SelectedGame/SelectedGamePage';

type SelectedGameScreenSharedProps = ComponentProps<typeof SelectedGamePage>;

export function SelectedGameScreenShared(props: SelectedGameScreenSharedProps) {
  return <SelectedGamePage {...props} />;
}
