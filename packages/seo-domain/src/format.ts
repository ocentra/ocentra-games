import { SeoIssueSeverity, type SeoAssetAuditResult, type SeoAuditReport, type SeoIssue, type SeoPageAuditResult } from './types';

function statusIcon(issues: readonly SeoIssue[]): string {
  if (issues.some(issue => issue.severity === SeoIssueSeverity.Error)) {
    return 'FAIL';
  }
  if (issues.some(issue => issue.severity === SeoIssueSeverity.Warning)) {
    return 'WARN';
  }
  return 'PASS';
}

function formatIssues(issues: readonly SeoIssue[]): string[] {
  return issues.map(issue => `    - ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
}

function formatPage(page: SeoPageAuditResult): string[] {
  const source = page.target.source ? ` [${page.target.source}]` : '';
  const depth = page.target.depth !== undefined ? ` depth=${page.target.depth}` : '';
  const discoveredFrom = page.target.discoveredFrom ? ` from=${page.target.discoveredFrom}` : '';
  const lines = [
    `${statusIcon(page.issues)} ${page.target.path}${source}${depth}${discoveredFrom} (${page.snapshot.status || 'fetch failed'})`,
    `    title: ${page.snapshot.title || '(missing)'}`,
    `    canonical: ${page.snapshot.canonicalPath || '(missing)'}`,
    `    robots: ${page.snapshot.robots || '(missing)'}`,
    `    html text: ${page.snapshot.seoBodyTextLength || page.snapshot.bodyTextLength}; links: ${page.snapshot.internalLinks.length}; json-ld: ${page.snapshot.jsonLdCount}`,
  ];
  return page.issues.length > 0 ? [...lines, ...formatIssues(page.issues)] : lines;
}

function formatAsset(asset: SeoAssetAuditResult): string[] {
  const discoveredLinks = asset.discoveredLinks?.length ? `; discovered links: ${asset.discoveredLinks.length}` : '';
  const lines = [`${statusIcon(asset.issues)} ${asset.path} (${asset.status || 'fetch failed'}${discoveredLinks})`];
  return asset.issues.length > 0 ? [...lines, ...formatIssues(asset.issues)] : lines;
}

export function formatSeoAuditReport(report: SeoAuditReport): string {
  return [
    `SEO audit: ${report.baseUrl}`,
    `Summary: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.pages} page(s), ${report.summary.assets} asset(s)`,
    `Phases: seed=${report.summary.seedPages}, sitemap=${report.summary.sitemapPages}, links=${report.summary.linkPages}, catalog-sample=${report.summary.catalogSamplePages}`,
    `Internal links: ${report.summary.internalLinks} found, ${report.summary.uniqueInternalLinks} unique`,
    '',
    'Assets',
    ...report.assets.flatMap(formatAsset),
    '',
    'Pages',
    ...report.pages.flatMap(formatPage),
    '',
  ].join('\n');
}
