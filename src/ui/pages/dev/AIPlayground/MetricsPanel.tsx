import React from 'react'

interface MetricsPanelProps {
  metrics: {
    ttft?: number
    tps?: string
    numTokens?: number
  }
  loadProgress: {
    progress: number
    status: 'initiate' | 'progress' | 'done' | 'error'
    message?: string
  } | null
  isModelLoading: boolean
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  loadProgress,
  isModelLoading,
}) => {
  return (
    <div className="metrics-panel">
      <h2>Performance Metrics</h2>

      <div className="metrics-panel__grid">
        <div className="metrics-panel__metric">
          <div className="metrics-panel__metric-label">Time to First Token (TTFT)</div>
          <div className="metrics-panel__metric-value">
            {metrics.ttft !== undefined ? `${metrics.ttft.toFixed(0)} ms` : 'N/A'}
          </div>
        </div>

        <div className="metrics-panel__metric">
          <div className="metrics-panel__metric-label">Tokens per Second (TPS)</div>
          <div className="metrics-panel__metric-value">
            {metrics.tps ? `${metrics.tps} tokens/s` : 'N/A'}
          </div>
        </div>

        <div className="metrics-panel__metric">
          <div className="metrics-panel__metric-label">Tokens Generated</div>
          <div className="metrics-panel__metric-value">
            {metrics.numTokens ?? 'N/A'}
          </div>
        </div>

        <div className="metrics-panel__metric">
          <div className="metrics-panel__metric-label">Model Status</div>
          <div className="metrics-panel__metric-value">
            {isModelLoading
              ? loadProgress?.status === 'error'
                ? 'Error'
                : 'Loading...'
              : 'Ready'}
          </div>
        </div>
      </div>

      {loadProgress && (
        <div className="metrics-panel__load-progress">
          <div className="metrics-panel__load-progress-bar">
            <div
              className="metrics-panel__load-progress-fill"
              style={{ width: `${loadProgress.progress}%` }}
            />
          </div>
          {loadProgress.message && (
            <div className="metrics-panel__load-progress-message">{loadProgress.message}</div>
          )}
        </div>
      )}
    </div>
  )
}

