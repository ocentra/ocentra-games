import type { UrlAuditRow } from './game-db';
export interface UrlAuditEntry {
    url: string;
    listNames: string[];
    listPaths: string[];
    jsonSlugs: string[];
}
export declare function buildUrlsAuditPayload(rows: UrlAuditRow[]): {
    urls: UrlAuditEntry[];
};
