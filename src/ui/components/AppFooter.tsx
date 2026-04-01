import React from 'react';
import { GameFooter } from '@ocentra/core-ui';
import { APP_VERSION } from '@/constants/version';

export const AppFooter: React.FC = () => <GameFooter appVersion={APP_VERSION} />;
