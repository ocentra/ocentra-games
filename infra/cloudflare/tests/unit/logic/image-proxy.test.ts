import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  proxyImageLogic,
  type ImageProxyFetch,
} from '@/logic/image-proxy';
import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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
  Googleusercontent: 'googleusercontent.com',
  Facebook: 'facebook.com',
  Evil: 'evil.com',
  ImageJpg: 'image.jpg',
  TestAgent: 'Test-Agent',
  StorageError: 'Storage error',
  NetworkError: 'Network error',
  MissingUrl: 'Missing url parameter',
  ImageSourceNotAllowed: 'Image source not allowed',
  FailedToFetch: 'Failed to fetch image',
  SubdomainGoogleusercontent: 'subdomain.googleusercontent.com',
  LookalikeGoogleusercontent: 'googleusercontent.com.evil.com',
  ImagePng: 'image/png',
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should proxy image from allowed domain'), async () => {
    logInfo('[TEST] Testing proxyImageLogic with allowed domain', getStackTrace(), { domain: TestConstants.Googleusercontent }, LOG_TEST_OPERATIONS);
    const imageData = new ArrayBuffer(100);
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        status: HttpStatus.Ok,
        arrayBuffer: vi.fn().mockResolvedValue(imageData),
        headers: {
          get: vi.fn().mockReturnValue(HttpContentType.ImageJpeg),
        },
      } as unknown as Response),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Googleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent, TestConstants.Facebook],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.imageData).toEqual(imageData);
    expect(result.contentType).toBe(HttpContentType.ImageJpeg);
    expect(result.statusCode).toBe(HttpStatus.Ok);
    if (!result.success || result.contentType !== HttpContentType.ImageJpeg || result.statusCode !== HttpStatus.Ok) {
      logError('[TEST] Image proxy failed or invalid', getStackTrace(), { success: result.success, contentType: result.contentType, statusCode: result.statusCode });
    }
    expect(mockFetch.fetch).toHaveBeenCalledWith(
      buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Googleusercontent}` }),
      { headers: { 'User-Agent': TestConstants.TestAgent } }
    );
  });

  it(testName('should reject when imageUrl is missing'), async () => {
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn(),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: '',
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.MissingUrl);
    expect(mockFetch.fetch).not.toHaveBeenCalled();
  });

  it(testName('should reject when domain not allowed'), async () => {
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn(),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Evil}` }),
        allowedDomains: [TestConstants.Googleusercontent, TestConstants.Facebook],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.ImageSourceNotAllowed);
    expect(mockFetch.fetch).not.toHaveBeenCalled();
  });

  it(testName('should allow trusted subdomains for allowed image domains'), async () => {
    const imageData = new ArrayBuffer(100);
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        status: HttpStatus.Ok,
        arrayBuffer: vi.fn().mockResolvedValue(imageData),
        headers: {
          get: vi.fn().mockReturnValue(TestConstants.ImagePng),
        },
      } as unknown as Response),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.SubdomainGoogleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(mockFetch.fetch).toHaveBeenCalled();
  });

  it(testName('should reject lookalike hostnames that only contain allowed domain as substring'), async () => {
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn(),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.LookalikeGoogleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.ImageSourceNotAllowed);
    expect(mockFetch.fetch).not.toHaveBeenCalled();
  });

  it(testName('should return error when fetch fails'), async () => {
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: HttpStatus.NotFound,
      } as Response),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Googleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.FailedToFetch);
    expect(result.statusCode).toBe(HttpStatus.NotFound);
  });

  it(testName('should use default content type when header missing'), async () => {
    const imageData = new ArrayBuffer(100);
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        status: HttpStatus.Ok,
        arrayBuffer: vi.fn().mockResolvedValue(imageData),
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as Response),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Googleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: TestConstants.ImagePng,
      },
      mockFetch
    );

    expect(result.success).toBe(true);
    expect(result.contentType).toBe(TestConstants.ImagePng);
  });

  it(testName('should handle fetch errors'), async () => {
    const mockFetch: ImageProxyFetch = {
      fetch: vi.fn().mockRejectedValue(new Error(TestConstants.NetworkError)),
    };

    const result = await proxyImageLogic(
      {
        imageUrl: buildFullUrl(`/${TestConstants.ImageJpg}`, { baseUrl: `https://${TestConstants.Googleusercontent}` }),
        allowedDomains: [TestConstants.Googleusercontent],
        userAgent: TestConstants.TestAgent,
        defaultContentType: HttpContentType.ImageJpeg,
      },
      mockFetch
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(TestConstants.NetworkError);
  });
});
