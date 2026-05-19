import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { validateWorkerOutboundBaseUrl } from '@/utils/worker-outbound-url-policy';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  it(testName('allows public HTTPS provider base URLs in production'), () => {
    const error = validateWorkerOutboundBaseUrl('https://api.openai.com/v1', {
      ENVIRONMENT: Environment.Production,
    });
    expect(error).toBeUndefined();
  });

  it(testName('rejects non-http provider base URL schemes'), () => {
    const error = validateWorkerOutboundBaseUrl('ftp://api.openai.com/v1', {
      ENVIRONMENT: Environment.Development,
    });
    expect(error).toBe('baseUrl must use http:// or https://');
  });

  it(testName('rejects localhost provider base URLs in production'), () => {
    const error = validateWorkerOutboundBaseUrl('http://localhost:1234/v1', {
      ENVIRONMENT: Environment.Production,
    });
    expect(error).toBe('baseUrl must not target private or localhost networks in production');
  });

  it(testName('rejects private IPv4 provider base URLs in production'), () => {
    const error = validateWorkerOutboundBaseUrl('http://192.168.1.20:8080/v1', {
      ENVIRONMENT: Environment.Production,
    });
    expect(error).toBe('baseUrl must not target private or localhost networks in production');
  });

  it(testName('allows localhost provider base URLs in test mode'), () => {
    const error = validateWorkerOutboundBaseUrl('http://localhost:1234/v1', {
      ENVIRONMENT: Environment.Production,
      TEST_MODE: QueryValue.True,
    });
    expect(error).toBeUndefined();
  });
});
