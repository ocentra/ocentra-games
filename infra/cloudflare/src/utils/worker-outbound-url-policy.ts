import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';

type OutboundUrlPolicyEnv = {
  ENVIRONMENT?: string;
  TEST_MODE?: string;
};

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIpv6(hostname: string): boolean {
  return (
    hostname === '::1' ||
    hostname === '::' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80:')
  );
}

function isPrivateNetworkHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  );
}

export function validateWorkerOutboundBaseUrl(baseUrl: string, env: OutboundUrlPolicyEnv): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return 'baseUrl must be a valid URL';
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'baseUrl must use http:// or https://';
  }

  const isProduction = env.ENVIRONMENT === Environment.Production && env.TEST_MODE !== QueryValue.True;
  if (!isProduction) return undefined;

  const hostname = normalizeHostname(parsed.hostname);
  if (isPrivateNetworkHost(hostname)) {
    return 'baseUrl must not target private or localhost networks in production';
  }

  return undefined;
}
