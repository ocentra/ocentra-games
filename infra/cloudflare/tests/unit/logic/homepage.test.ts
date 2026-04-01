import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { generateHomepageHtml, type HomepageEnvironment } from '@/logic/homepage';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const TestConstants = {
  ExampleCom: 'https://example.com',
  ApiExampleCom: 'https://api.example.com',
  TestExampleCom: 'https://test.example.com',
  Localhost8787: 'http://localhost:8787',
  ClaimStorageWorkersDev: 'https://claim-storage.workers.dev',
  Development: 'development',
  Production: 'production',
  Staging: 'staging',
  Test: 'test',
  DoctypeHtml: '<!DOCTYPE html>',
  HtmlLangEn: '<html lang="en">',
  HtmlClose: '</html>',
  Title: 'Claim Storage API',
  MetaCharset: '<meta charset="UTF-8">',
  MetaViewport: '<meta name="viewport"',
  BaseUrl: 'Base URL:',
  Environment: 'Environment:',
  ApiDocs: '/api/docs',
  OpenapiJson: '/openapi.json',
  Health: '/health',
  Explore: '/explore',
  ApiMetrics: '/api/metrics',
  SwaggerUI: 'Swagger UI',
  OpenAPIJSON: 'OpenAPI JSON',
  MatchExplorer: 'Match Explorer',
  QuickLinks: 'Quick Links',
  ApiMatches: '/api/matches',
  ApiDisputes: '/api/disputes',
  ApiAiOnEvent: '/api/ai/on_event',
  ApiDataExport: '/api/data-export',
  ApiLeaderboard: '/api/leaderboard',
  ApiSignedUrl: '/api/signed-url',
  ApiArchive: '/api/archive',
  PutApiMatches: 'PUT /api/matches',
  GetApiMatches: 'GET /api/matches',
  DeleteApiMatches: 'DELETE /api/matches',
  PostApiDisputes: 'POST /api/disputes',
  TestEndpoints: 'Test Endpoints',
  Warning: 'WARNING',
  ApiTestClearAll: '/api/test/clear-all',
  Dangerous: 'DANGEROUS',
  Irreversible: 'IRREVERSIBLE',
  ApiDocumentation: 'API Documentation',
  AvailableEndpoints: 'Available Endpoints',
  Documentation: 'Documentation',
  Style: '<style>',
  StyleClose: '</style>',
  FontFamily: 'font-family',
  Background: 'background',
  Color: 'color',
  MinLength: 1000,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  logInfo('[TEST] Starting homepage HTML generation tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  it(testName('HTML structure: returns valid HTML document'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.DoctypeHtml);
    expect(html).toContain(TestConstants.HtmlLangEn);
    expect(html).toContain(TestConstants.HtmlClose);
    expect(html.length).toBeGreaterThan(TestConstants.MinLength);
  });

  it(testName('HTML structure: includes page title'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`<title>${TestConstants.Title}</title>`);
    expect(html).toContain(TestConstants.Title);
  });

  it(testName('HTML structure: includes meta tags'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.MetaCharset);
    expect(html).toContain(TestConstants.MetaViewport);
  });

  it(testName('base URL integration: includes base URL in HTML content'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ApiExampleCom, env);

    expect(html).toContain(TestConstants.ApiExampleCom);
    expect(html).toContain(`${TestConstants.ApiExampleCom}${TestConstants.ApiDocs}`);
    expect(html).toContain(`${TestConstants.ApiExampleCom}${TestConstants.OpenapiJson}`);
    expect(html).toContain(`${TestConstants.ApiExampleCom}${TestConstants.Health}`);
    expect(html).toContain(`${TestConstants.ApiExampleCom}${TestConstants.Explore}`);
  });

  it(testName('base URL integration: includes base URL in environment section'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Production };
    const html = generateHomepageHtml(TestConstants.TestExampleCom, env);

    expect(html).toContain(`<strong>${TestConstants.BaseUrl}</strong> <code>${TestConstants.TestExampleCom}</code>`);
  });

  it(testName('base URL integration: handles different base URL formats'), () => {
    const baseUrls = [
      TestConstants.ApiExampleCom,
      TestConstants.Localhost8787,
      TestConstants.ClaimStorageWorkersDev,
    ];

    for (const baseUrl of baseUrls) {
      const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
      const html = generateHomepageHtml(baseUrl, env);
      expect(html).toContain(baseUrl);
    }
  });

  it(testName('environment information: includes environment value when provided'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Production };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`<strong>${TestConstants.Environment}</strong> ${TestConstants.Production}`);
  });

  it(testName('environment information: defaults to development when environment not provided'), () => {
    const env: HomepageEnvironment = {};
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`<strong>${TestConstants.Environment}</strong> ${TestConstants.Development}`);
  });

  it(testName('environment information: defaults to development when environment is undefined'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: undefined };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`<strong>${TestConstants.Environment}</strong> ${TestConstants.Development}`);
  });

  it(testName('environment information: handles different environment values'), () => {
    const environments = [TestConstants.Development, TestConstants.Production, TestConstants.Staging, TestConstants.Test];

    for (const environment of environments) {
      const env: HomepageEnvironment = { ENVIRONMENT: environment };
      const html = generateHomepageHtml(TestConstants.ExampleCom, env);
      expect(html).toContain(`<strong>${TestConstants.Environment}</strong> ${environment}`);
    }
  });

  it(testName('API documentation links: include links to API documentation'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.ApiDocs}`);
    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.OpenapiJson}`);
    expect(html).toContain(TestConstants.SwaggerUI);
    expect(html).toContain(TestConstants.OpenAPIJSON);
  });

  it(testName('API documentation links: include explore link'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.Explore}`);
    expect(html).toContain(TestConstants.MatchExplorer);
  });

  it(testName('API documentation links: include quick links section'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.QuickLinks);
    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.Health}`);
    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.ApiMetrics}`);
    expect(html).toContain(`${TestConstants.ExampleCom}${TestConstants.ApiDocs}`);
  });

  it(testName('endpoint documentation: includes all API endpoints'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.ApiMatches);
    expect(html).toContain(TestConstants.ApiDisputes);
    expect(html).toContain(TestConstants.ApiAiOnEvent);
    expect(html).toContain(TestConstants.ApiDataExport);
    expect(html).toContain(TestConstants.ApiLeaderboard);
    expect(html).toContain(TestConstants.ApiSignedUrl);
    expect(html).toContain(TestConstants.ApiArchive);
  });

  it(testName('endpoint documentation: includes endpoint methods'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.PutApiMatches);
    expect(html).toContain(TestConstants.GetApiMatches);
    expect(html).toContain(TestConstants.DeleteApiMatches);
    expect(html).toContain(TestConstants.PostApiDisputes);
    if (!html.includes(TestConstants.PutApiMatches) || !html.includes(TestConstants.GetApiMatches)) {
      logError('[TEST] Homepage missing endpoint methods', getStackTrace(), { htmlLength: html.length, hasPut: html.includes(TestConstants.PutApiMatches), hasGet: html.includes(TestConstants.GetApiMatches) });
    }
  });

  it(testName('test endpoints warning: includes test endpoints warning section'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.TestEndpoints);
    expect(html).toContain(TestConstants.Warning);
    expect(html).toContain(TestConstants.ApiTestClearAll);
  });

  it(testName('test endpoints warning: includes danger warning text'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.Dangerous);
    expect(html).toContain(TestConstants.Development);
    expect(html).toContain(TestConstants.Irreversible);
  });

  it(testName('content integrity: includes all major sections'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.ApiDocumentation);
    expect(html).toContain(TestConstants.QuickLinks);
    expect(html).toContain(TestConstants.AvailableEndpoints);
    expect(html).toContain(TestConstants.TestEndpoints);
    expect(html).toContain(TestConstants.Environment);
    expect(html).toContain(TestConstants.Documentation);
  });

  it(testName('content integrity: includes CSS styles'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };
    const html = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html).toContain(TestConstants.Style);
    expect(html).toContain(TestConstants.StyleClose);
    expect(html).toContain(TestConstants.FontFamily);
    expect(html).toContain(TestConstants.Background);
    expect(html).toContain(TestConstants.Color);
  });

  it(testName('content integrity: produces consistent output for same inputs'), () => {
    const env: HomepageEnvironment = { ENVIRONMENT: TestConstants.Development };

    const html1 = generateHomepageHtml(TestConstants.ExampleCom, env);
    const html2 = generateHomepageHtml(TestConstants.ExampleCom, env);

    expect(html1).toBe(html2);
  });
});
