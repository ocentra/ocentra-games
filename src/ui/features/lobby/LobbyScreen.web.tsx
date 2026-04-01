import type { ComponentProps } from 'react';
import { LobbyScreenShared } from '@/ui/features/lobby/LobbyScreen.shared';

type LobbyScreenProps = ComponentProps<typeof LobbyScreenShared>;

export function LobbyScreenWeb(props: LobbyScreenProps) {
  return <LobbyScreenShared {...props} />;
}
