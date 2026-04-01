export const Hostname = {
  Localhost: 'localhost',
  Ipv4Loopback: '127.0.0.1',
} as const;

export type Hostname = (typeof Hostname)[keyof typeof Hostname];

export function isLocalHostname(hostname: string): boolean {
  return hostname === Hostname.Localhost || hostname === Hostname.Ipv4Loopback;
}
