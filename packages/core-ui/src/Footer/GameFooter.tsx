import type React from 'react';
import { UnifiedFooter } from './UnifiedFooter';

export interface GameFooterProps {
  appVersion?: string;
  rightContent?: React.ReactNode;
}

export const GameFooter: React.FC<GameFooterProps> = ({ appVersion, rightContent }) => {
  return <UnifiedFooter appVersion={appVersion} rightContent={rightContent} />;
};
