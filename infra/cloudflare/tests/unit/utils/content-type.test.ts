import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { getContentType } from '@ocentra/endpoint-domain/utils/content-type';
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

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('getContentType: returns PNG for .png extension'), () => {
    logInfo('[TEST] Testing getContentType for PNG', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const result1 = getContentType('image.png');
    const result2 = getContentType('path/to/image.PNG');
    expect(result1).toBe(HttpContentType.ImagePng);
    expect(result2).toBe(HttpContentType.ImagePng);
    if (result1 !== HttpContentType.ImagePng || result2 !== HttpContentType.ImagePng) {
      logError('[TEST] Content type detection failed for PNG', getStackTrace(), { result1, result2 });
    }
    logInfo('[TEST] Content type test completed', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('getContentType: returns JPEG for .jpg extension'), () => {
    expect(getContentType('image.jpg')).toBe(HttpContentType.ImageJpeg);
    expect(getContentType('photo.JPG')).toBe(HttpContentType.ImageJpeg);
  });

  it(testName('getContentType: returns JPEG for .jpeg extension'), () => {
    expect(getContentType('image.jpeg')).toBe(HttpContentType.ImageJpeg);
    expect(getContentType('photo.JPEG')).toBe(HttpContentType.ImageJpeg);
  });

  it(testName('getContentType: returns GIF for .gif extension'), () => {
    expect(getContentType('animation.gif')).toBe(HttpContentType.ImageGif);
  });

  it(testName('getContentType: returns WebP for .webp extension'), () => {
    expect(getContentType('image.webp')).toBe(HttpContentType.ImageWebp);
  });

  it(testName('getContentType: returns SVG for .svg extension'), () => {
    expect(getContentType('icon.svg')).toBe(HttpContentType.ImageSvgXml);
  });

  it(testName('getContentType: returns JSON for .asset extension'), () => {
    expect(getContentType('resource.asset')).toBe(HttpContentType.ApplicationJson);
  });

  it(testName('getContentType: returns JSON for .json extension'), () => {
    expect(getContentType('data.json')).toBe(HttpContentType.ApplicationJson);
  });

  it(testName('getContentType: returns WOFF for .woff extension'), () => {
    expect(getContentType('font.woff')).toBe(HttpContentType.FontWoff);
  });

  it(testName('getContentType: returns WOFF2 for .woff2 extension'), () => {
    expect(getContentType('font.woff2')).toBe(HttpContentType.FontWoff2);
  });

  it(testName('getContentType: returns TTF for .ttf extension'), () => {
    expect(getContentType('font.ttf')).toBe(HttpContentType.FontTtf);
  });

  it(testName('getContentType: returns OTF for .otf extension'), () => {
    expect(getContentType('font.otf')).toBe(HttpContentType.FontOtf);
  });

  it(testName('getContentType: returns plain text for .txt extension'), () => {
    expect(getContentType('readme.txt')).toBe(HttpContentType.TextPlain);
  });

  it(testName('getContentType: returns HTML for .html extension'), () => {
    expect(getContentType('index.html')).toBe(HttpContentType.TextHtml);
  });

  it(testName('getContentType: returns CSS for .css extension'), () => {
    expect(getContentType('style.css')).toBe(HttpContentType.TextCss);
  });

  it(testName('getContentType: returns JavaScript for .js extension'), () => {
    expect(getContentType('script.js')).toBe(HttpContentType.ApplicationJavascript);
  });

  it(testName('getContentType: returns octet stream for unknown extension'), () => {
    expect(getContentType('file.unknown')).toBe(HttpContentType.OctetStream);
    expect(getContentType('file')).toBe(HttpContentType.OctetStream);
  });

  it(testName('getContentType: returns octet stream for path without extension'), () => {
    expect(getContentType('path/to/file')).toBe(HttpContentType.OctetStream);
  });

  it(testName('getContentType: handles case insensitive extensions'), () => {
    expect(getContentType('image.PNG')).toBe(HttpContentType.ImagePng);
    expect(getContentType('photo.JpEg')).toBe(HttpContentType.ImageJpeg);
    expect(getContentType('data.JSON')).toBe(HttpContentType.ApplicationJson);
  });

  it(testName('getContentType: handles multiple dots in path'), () => {
    expect(getContentType('path.with.dots/image.png')).toBe(HttpContentType.ImagePng);
    expect(getContentType('file.min.js')).toBe(HttpContentType.ApplicationJavascript);
  });

  it(testName('getContentType: handles empty string'), () => {
    expect(getContentType('')).toBe(HttpContentType.OctetStream);
  });
});
