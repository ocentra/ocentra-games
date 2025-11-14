#!/usr/bin/env tsx
/**
 * Check alert thresholds per spec Section 32.2.
 * Reads metrics and checks against thresholds.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { checkAlertThresholds } from '@infra/cloudflare/src/monitoring';
import type { AllMetrics } from '@services/monitoring/MetricsCollector';

async function checkAlerts(): Promise<void> {
  console.log('Checking alert thresholds...');

  // Try to load metrics from R2 or local file
  // In production, this would fetch from metrics storage
  const metricsPath = join(process.cwd(), 'metrics', 'latest.json');
  
  let metrics: AllMetrics;
  if (existsSync(metricsPath)) {
    metrics = JSON.parse(readFileSync(metricsPath, 'utf-8'));
  } else {
    console.warn('Metrics file not found, using empty metrics');
    metrics = {
      transactions: {
        submissions_total: 0,
        confirmations_total: 0,
        failures_total: 0,
        confirmation_latency_seconds: [],
        pending_count: 0,
      },
      matches: {
        created_total: 0,
        completed_total: 0,
        abandoned_total: 0,
        duration_seconds: [],
      },
      storage: {
        uploads_total: 0,
        uploads_failed_total: 0,
        storage_bytes: 0,
        upload_latency_seconds: [],
      },
      disputes: {
        flagged_total: 0,
        resolved_total: 0,
        resolution_time_seconds: [],
      },
      timestamp: new Date().toISOString(),
    };
  }

  const alerts = checkAlertThresholds(metrics);

  console.log('\n=== Alert Check Results ===');
  console.log(`Total alerts: ${alerts.length}`);
  
  const critical = alerts.filter(a => a.level === 'critical');
  const warning = alerts.filter(a => a.level === 'warning');
  const info = alerts.filter(a => a.level === 'info');

  if (critical.length > 0) {
    console.log(`\nCritical Alerts (${critical.length}):`);
    critical.forEach(alert => {
      console.log(`  [CRITICAL] ${alert.metric}: ${alert.message}`);
    });
  }

  if (warning.length > 0) {
    console.log(`\nWarning Alerts (${warning.length}):`);
    warning.forEach(alert => {
      console.log(`  [WARNING] ${alert.metric}: ${alert.message}`);
    });
  }

  if (info.length > 0) {
    console.log(`\nInfo Alerts (${info.length}):`);
    info.forEach(alert => {
      console.log(`  [INFO] ${alert.metric}: ${alert.message}`);
    });
  }

  if (alerts.length === 0) {
    console.log('\nNo alerts - all metrics within thresholds');
  }

  // Exit with error code if critical alerts
  if (critical.length > 0) {
    process.exit(1);
  }
}

checkAlerts().catch((error) => {
  console.error('Alert check failed:', error);
  process.exit(1);
});

