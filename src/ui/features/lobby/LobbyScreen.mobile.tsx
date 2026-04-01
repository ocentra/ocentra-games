import type { ComponentProps } from 'react';
import { LobbyScreenShared } from '@/ui/features/lobby/LobbyScreen.shared';

type LobbyScreenProps = ComponentProps<typeof LobbyScreenShared>;

export function LobbyScreenMobile(props: LobbyScreenProps) {
  return (
    <div data-platform-feature="lobby-mobile" data-platform-screen="lobby">
      <LobbyScreenShared {...props} />
    </div>
  );
}
