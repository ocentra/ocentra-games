import { TimeInMs } from '@/constants/time';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';

export const SecuritySeverity = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;

export type SecuritySeverity = typeof SecuritySeverity[keyof typeof SecuritySeverity];

export const SecuritySeverityIndex = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
  Default: 0,
} as const;

export type SecuritySeverityIndex = typeof SecuritySeverityIndex[keyof typeof SecuritySeverityIndex];

export const SecuritySeverityEmoji = {
  Critical: '🚨',
  High: '⚠️',
  Medium: '⚡',
  Low: 'ℹ️',
  Default: '📌',
} as const;

export type SecuritySeverityEmoji = typeof SecuritySeverityEmoji[keyof typeof SecuritySeverityEmoji];

export const SecuritySeverityColor = {
  Critical: 0xFF0000,
  High: 0xFF9900,
  Medium: 0xFFFF00,
  Low: 0x00FF00,
  Default: 0x808080,
} as const;

export type SecuritySeverityColor = typeof SecuritySeverityColor[keyof typeof SecuritySeverityColor];

export const SecurityAlertField = {
  Severity: 'Severity',
  Timestamp: 'Timestamp',
  UserId: 'User ID',
  WalletId: 'Wallet ID',
  IpAddress: 'IP Address',
  Origin: 'Origin',
  CorrelationId: 'Correlation ID',
  Details: 'Details',
} as const;

export type SecurityAlertField = typeof SecurityAlertField[keyof typeof SecurityAlertField];

export const SecuritySsrfDangerousScheme = {
  Http: 'http://',
  Https: 'https://',
  File: 'file://',
  Ftp: 'ftp://',
  Gopher: 'gopher://',
  Dict: 'dict://',
  Ldap: 'ldap://',
  Ldaps: 'ldaps://',
  Sftp: 'sftp://',
  Ssh: 'ssh://',
  Telnet: 'telnet://',
  Tftp: 'tftp://',
  Ws: 'ws://',
  Wss: 'wss://',
} as const;

export type SecuritySsrfDangerousScheme = typeof SecuritySsrfDangerousScheme[keyof typeof SecuritySsrfDangerousScheme];

export const SecuritySsrfInternalIp = {
  Localhost127001: '127.0.0.1',
  Localhost127000: '127.0.0.0',
  Localhost: 'localhost',
  Zero: '0.0.0.0',
  LinkLocal169254: '169.254.',
  Private192168: '192.168.',
  Private10: '10.',
  Private17216: '172.16.',
  Private17217: '172.17.',
  Private17218: '172.18.',
  Private17219: '172.19.',
  Private17220: '172.20.',
  Private17221: '172.21.',
  Private17222: '172.22.',
  Private17223: '172.23.',
  Private17224: '172.24.',
  Private17225: '172.25.',
  Private17226: '172.26.',
  Private17227: '172.27.',
  Private17228: '172.28.',
  Private17229: '172.29.',
  Private17230: '172.30.',
  Private17231: '172.31.',
  Ipv6Localhost1: '[::1]',
  Ipv6Localhost2: '[::ffff:127.0.0.1]',
  Ipv6Localhost3: '::1',
  Ipv6Localhost4: '::ffff:127.0.0.1',
} as const;

export type SecuritySsrfInternalIp = typeof SecuritySsrfInternalIp[keyof typeof SecuritySsrfInternalIp];

export const SecuritySsrfMetadataEndpoint = {
  GoogleInternal: 'metadata.google.internal',
  Aws169254: '169.254.169.254',
  Azure: 'metadata.azure.com',
  Aws: 'metadata.aws.amazon.com',
  GoogleCloud: 'metadata.cloud.google.com',
  Microsoft: 'metadata.microsoft.com',
  Consul: 'metadata.service.consul',
} as const;

export type SecuritySsrfMetadataEndpoint = typeof SecuritySsrfMetadataEndpoint[keyof typeof SecuritySsrfMetadataEndpoint];

export const SecurityAttackDetection = {
  KvKeyPrefix: KvKeyPrefix.Attack,
  WindowMs: TimeInMs.Minute,
  Threshold: 10,
  MinTtlSeconds: 60,
} as const;

export type SecurityAttackDetection = typeof SecurityAttackDetection[keyof typeof SecurityAttackDetection];

export const SecurityErrorMessage = {
  FailedToLogToAnalytics: 'Failed to log to Analytics',
  FailedToSendAlert: 'Failed to send alert',
  FailedToDetectAttackPattern: 'Failed to detect attack pattern',
} as const;

export type SecurityErrorMessage = typeof SecurityErrorMessage[keyof typeof SecurityErrorMessage];

export const SecurityLogModule = {
  SecurityMonitoring: 'SecurityMonitoring',
} as const;

export type SecurityLogModule = typeof SecurityLogModule[keyof typeof SecurityLogModule];
