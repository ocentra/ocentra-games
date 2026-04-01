import type { Env } from '@/constants/env';

export interface SecurityDashboardSummary {
  recentPenaltyCount: number;
  recentAppealsPending: number;
  fraudCheckCount: number;
  lastUpdated: number;
}

export class SecurityMonitoringService {
  constructor(private readonly _env: Env) {}

  async getDashboardSummary(): Promise<SecurityDashboardSummary> {
    return {
      recentPenaltyCount: 0,
      recentAppealsPending: 0,
      fraudCheckCount: 0,
      lastUpdated: Date.now(),
    };
  }
}
