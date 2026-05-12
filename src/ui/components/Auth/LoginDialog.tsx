import React, { useEffect, useState } from 'react';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  LoginDialog as SharedLoginDialog,
  type LoginDialogProps,
} from '@ocentra/core-ui/Auth/LoginDialog';
import type { AuthPageSvgControls } from '@ocentra/core-ui/Auth/CyberAuthSurface';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
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
const AUTH_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/AuthPageLayout.asset';

type ResourceEntryRef = { guid?: string; path?: string; assetType?: string };
type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function findGuidByPath(resources: ResourceEntryRef[], path: string, assetType = ''): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return '';
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || resource.assetType === assetType)
  ))?.guid ?? '';
}

async function loadAuthPageLayoutControls(): Promise<Partial<AuthPageSvgControls> | undefined> {
  const resources = await getEntryIndexResourceEntries();
  const guid = findGuidByPath(resources, AUTH_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!guid) return undefined;
  const layoutDocument = await loadRawAssetDocumentByGuid(guid, { cache: 'no-store' });
  const controls = asRecord(dataOf(layoutDocument).authControls);
  return Object.keys(controls).length > 0 ? controls as Partial<AuthPageSvgControls> : undefined;
}

const LoginDialog: React.FC<LoginDialogProps> = (props) => {
  const [layoutControls, setLayoutControls] = useState<Partial<AuthPageSvgControls> | undefined>(undefined);

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

  useEffect(() => {
    let cancelled = false;
    void loadAuthPageLayoutControls()
      .then((controls) => {
        if (!cancelled) setLayoutControls(controls);
      })
      .catch((error) => {
        logError('[LoginDialog] Failed to load auth layout controls', error, LOG_AUTH_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SharedLoginDialog {...props} appVersion={APP_VERSION} layoutControls={props.layoutControls ?? layoutControls} />;
};

export default LoginDialog;
