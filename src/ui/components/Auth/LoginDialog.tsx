import React, { useEffect } from 'react';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  LoginDialog as SharedLoginDialog,
  type LoginDialogProps,
} from '@ocentra/core-ui/Auth/LoginDialog';
import { APP_VERSION } from '@/constants/version';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_AUTH_REDIRECT = false;
const LOG_AUTH_ERROR = false;

const LoginDialog: React.FC<LoginDialogProps> = (props) => {
  useEffect(() => {
    const checkRedirect = async () => {
      logInfo('Checking for redirect result on mount...', undefined, LOG_AUTH_REDIRECT);
      const { handleRedirectResult } = await import('@/adapters/firebase/service');
      const result = await handleRedirectResult();
      if (result.success) {
        logInfo(
          'Login successful after redirect:',
          {
            uid: result.user?.uid,
            displayName: result.user?.displayName,
          },
          LOG_AUTH_REDIRECT,
        );
        return;
      }

      if (result.error && result.error !== 'No redirect result') {
        logError('Login failed after redirect:', result.error, LOG_AUTH_ERROR);
      } else {
        logInfo('No redirect result (normal if not returning from OAuth)', undefined, LOG_AUTH_REDIRECT);
      }
    };

    void checkRedirect();
  }, []);

  return <SharedLoginDialog {...props} appVersion={APP_VERSION} />;
};

export default LoginDialog;
