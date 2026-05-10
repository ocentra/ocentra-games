import type { ApiPath } from '@/types/brands';
import { Hostname } from './hostname';

const localApiPrefix = '/local/api';
const apiPrefix = '/api';
const localHttpProtocol = 'http';

export const LocalApiEndpoint = {
  Profile: '/_dev/profile' as ApiPath,
  Logs: {
    Base: `${localApiPrefix}/logs` as ApiPath,
    Query: `${localApiPrefix}/logs/query` as ApiPath,
    Stats: `${localApiPrefix}/logs/stats` as ApiPath,
    Clear: `${localApiPrefix}/logs/clear` as ApiPath,
  },

  OpenInEditor: `${localApiPrefix}/open-in-editor` as ApiPath,
  HeaderConfig: `${localApiPrefix}/header-config` as ApiPath,

  AssetEditor: {
    DiskResourceEntries: `${localApiPrefix}/asset-editor/disk-resource-entries` as ApiPath,
    WriteAsset: `${localApiPrefix}/asset-editor/write-asset` as ApiPath,
  },

  CardGames: {
    Games: `${apiPrefix}/games` as ApiPath,
    GamesPath: '/games' as const,
    GameBySlug: (slug: string): ApiPath => `${apiPrefix}/games/${encodeURIComponent(slug)}` as ApiPath,
    UrlsAudit: `${apiPrefix}/urls-audit` as ApiPath,
    UrlsAuditPath: '/urls-audit' as const,
    CheckUrl: `${apiPrefix}/check-url` as ApiPath,
    CheckUrlPath: '/check-url' as const,
    ExportUrlAudit: `${apiPrefix}/export-url-audit` as ApiPath,
    ExportUrlAuditPath: '/export-url-audit' as const,
    NamesAudit: `${apiPrefix}/names-audit` as ApiPath,
    NamesAuditPath: '/names-audit' as const,
    Reingest: `${apiPrefix}/reingest` as ApiPath,
    ReingestPath: '/reingest' as const,
    RunValidate: `${apiPrefix}/run-validate` as ApiPath,
    RunValidatePath: '/run-validate' as const,
    ExportGames: `${apiPrefix}/export-games` as ApiPath,
    ExportGamesPath: '/export-games' as const,
    MountBase: apiPrefix as ApiPath,
  },
} as const;

export const CloudflareLocalConfig = {
  Port: 8787,
  Host: Hostname.Localhost,
  get BaseUrl() {
    return createLocalHttpBaseUrl(this.Host, this.Port);
  },
} as const;

export const LocalWebConfig = {
  Port: 3000,
  Host: Hostname.Localhost,
  get BaseUrl() {
    return createLocalHttpBaseUrl(this.Host, this.Port);
  },
} as const;

export function createLocalHttpBaseUrl(host: string, port: number): string {
  return `${localHttpProtocol}://${host}:${port}`;
}
