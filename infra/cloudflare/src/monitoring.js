/**
 * Cloudflare Workers metrics emission per spec Section 32.1.
 * Emits metrics to Cloudflare Analytics or external service.
 */
/**
 * Emits metrics from Cloudflare Worker.
 * Per spec Section 32.1: Emits to Cloudflare Analytics or external service.
 * Per spec Section 32.2: Connects alerting infrastructure for notifications.
 */
export async function emitMetrics(metrics, env) {
    // Emit to Cloudflare Analytics (if configured)
    // In production, use Cloudflare Analytics API or Workers Analytics Engine
    // Log metrics
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
    // Store metrics in R2 for historical analysis (optional)
    if (env.MATCHES_BUCKET) {
        try {
            const metricsKey = `metrics/${new Date().toISOString().split('T')[0]}/${Date.now()}.json`;
            await env.MATCHES_BUCKET.put(metricsKey, JSON.stringify(metrics), {
                httpMetadata: {
                    contentType: 'application/json',
                },
            });
        }
        catch (error) {
            console.error('Failed to store metrics:', error);
        }
    }
    // Per spec Section 32.2: Send alerts if webhook configured
    const alerts = checkAlertThresholds(metrics);
    if (alerts.length > 0 && env.ALERT_WEBHOOK_URL) {
        try {
            await fetch(env.ALERT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alerts,
                    metrics: {
                        timestamp: metrics.timestamp,
                        transactions: {
                            submissions: metrics.transactions.submissions_total,
                            failures: metrics.transactions.failures_total,
                            pending: metrics.transactions.pending_count,
                        },
                        matches: {
                            created: metrics.matches.created_total,
                            completed: metrics.matches.completed_total,
                            abandoned: metrics.matches.abandoned_total,
                        },
                    },
                }),
            });
        }
        catch (error) {
            console.error('Failed to send alert webhook:', error);
        }
    }
}
export function checkAlertThresholds(metrics) {
    const alerts = [];
    // Critical alerts per spec Section 32.2
    const txFailureRate = metrics.transactions.submissions_total > 0
        ? (metrics.transactions.failures_total / metrics.transactions.submissions_total) * 100
        : 0;
    if (txFailureRate > 10) {
        alerts.push({
            level: 'critical',
            metric: 'tx_failure_rate',
            value: txFailureRate,
            threshold: 10,
            message: `Transaction failure rate ${txFailureRate.toFixed(2)}% exceeds critical threshold of 10%`,
        });
    }
    if (metrics.transactions.pending_count > 1000) {
        alerts.push({
            level: 'critical',
            metric: 'tx_pending_count',
            value: metrics.transactions.pending_count,
            threshold: 1000,
            message: `Pending transaction queue ${metrics.transactions.pending_count} exceeds critical threshold of 1000`,
        });
    }
    const r2ErrorRate = metrics.storage.uploads_total > 0
        ? (metrics.storage.uploads_failed_total / (metrics.storage.uploads_total + metrics.storage.uploads_failed_total)) * 100
        : 0;
    if (r2ErrorRate > 5) {
        alerts.push({
            level: 'critical',
            metric: 'r2_error_rate',
            value: r2ErrorRate,
            threshold: 5,
            message: `R2 error rate ${r2ErrorRate.toFixed(2)}% exceeds critical threshold of 5%`,
        });
    }
    const abandonmentRate = metrics.matches.created_total > 0
        ? (metrics.matches.abandoned_total / metrics.matches.created_total) * 100
        : 0;
    if (abandonmentRate > 20) {
        alerts.push({
            level: 'critical',
            metric: 'match_abandonment_rate',
            value: abandonmentRate,
            threshold: 20,
            message: `Match abandonment rate ${abandonmentRate.toFixed(2)}% exceeds critical threshold of 20%`,
        });
    }
    // Warning alerts per spec Section 32.2
    if (txFailureRate > 5 && txFailureRate <= 10) {
        alerts.push({
            level: 'warning',
            metric: 'tx_failure_rate',
            value: txFailureRate,
            threshold: 5,
            message: `Transaction failure rate ${txFailureRate.toFixed(2)}% exceeds warning threshold of 5%`,
        });
    }
    const avgLatency = metrics.transactions.confirmation_latency_seconds.length > 0
        ? metrics.transactions.confirmation_latency_seconds.reduce((a, b) => a + b, 0) / metrics.transactions.confirmation_latency_seconds.length
        : 0;
    if (avgLatency > 5) {
        alerts.push({
            level: 'warning',
            metric: 'tx_avg_latency',
            value: avgLatency,
            threshold: 5,
            message: `Average confirmation latency ${avgLatency.toFixed(2)}s exceeds warning threshold of 5s`,
        });
    }
    const storageUsageGB = metrics.storage.storage_bytes / (1024 * 1024 * 1024);
    const storageUsagePercent = (storageUsageGB / 10) * 100; // Assuming 10GB free tier
    if (storageUsagePercent > 80) {
        alerts.push({
            level: 'warning',
            metric: 'storage_usage',
            value: storageUsagePercent,
            threshold: 80,
            message: `Storage usage ${storageUsagePercent.toFixed(2)}% exceeds warning threshold of 80%`,
        });
    }
    const avgResolutionTime = metrics.disputes.resolution_time_seconds.length > 0
        ? metrics.disputes.resolution_time_seconds.reduce((a, b) => a + b, 0) / metrics.disputes.resolution_time_seconds.length
        : 0;
    if (avgResolutionTime > 48 * 3600) { // 48 hours in seconds
        alerts.push({
            level: 'warning',
            metric: 'dispute_resolution_time',
            value: avgResolutionTime,
            threshold: 48 * 3600,
            message: `Average dispute resolution time ${(avgResolutionTime / 3600).toFixed(2)}h exceeds warning threshold of 48h`,
        });
    }
    return alerts;
}
