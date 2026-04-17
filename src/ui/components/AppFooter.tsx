import React from 'react';
import { GameFooter } from '@ocentra/core-ui';
import { APP_VERSION } from '@/constants/version';

interface AppFooterProps {
  rightContent?: React.ReactNode;
}

export const AppFooter: React.FC<AppFooterProps> = ({ rightContent }) => (
  <GameFooter appVersion={APP_VERSION} rightContent={rightContent} />
);
