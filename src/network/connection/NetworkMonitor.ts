import { NetworkStats, NetworkQuality, ConnectionStatus } from '../types'
import { WebRTCHandler } from './WebRTCHandler'

export interface NetworkMetrics {
  peerId: string
  quality: NetworkQuality
  stats: NetworkStats
  status: ConnectionStatus
  timestamp: number
}

export interface AdaptiveSettings {
  enableLagCompensation: boolean
  reducedQuality: boolean
  prioritizeStability: boolean
  maxRetransmissions: number
}

export class NetworkMonitor {
  private webrtcHandler: WebRTCHandler
  private monitoringInterval: NodeJS.Timeout | null = null
  private metricsHistory: Map<string, NetworkMetrics[]> = new Map()
  private adaptiveSettings: AdaptiveSettings
  private onQualityChangeCallback?: (peerId: string, quality: NetworkQuality, metrics: NetworkMetrics) => void
  private onAdaptiveChangeCallback?: (settings: AdaptiveSettings) => void

  private readonly MONITORING_INTERVAL = 5000 // 5 seconds
  private readonly HISTORY_LIMIT = 20 // Keep last 20 measurements per peer
  private readonly PING_INTERVAL = 2000 // 2 seconds

  constructor(webrtcHandler: WebRTCHandler) {
    this.webrtcHandler = webrtcHandler
    this.adaptiveSettings = {
      enableLagCompensation: false,
      reducedQuality: false,
      prioritizeStability: false,
      maxRetransmissions: 3,
    }
  }

  /**
   * Start network monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return

    console.log('Starting network monitoring')
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.MONITORING_INTERVAL)

    // Start ping monitoring
    this.startPingMonitoring()
  }

  /**
   * Stop network monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('Network monitoring stopped')
  }

  /**
   * Start periodic ping monitoring for latency measurement
   */
  private startPingMonitoring(): void {
    setInterval(() => {
      const connectedPeers = this.webrtcHandler.getConnectedPeers()
      connectedPeers.forEach(peerId => {
        this.webrtcHandler.sendPing(peerId)
      })
    }, this.PING_INTERVAL)
  }

  /**
   * Collect network metrics for all connected peers
   */
  private async collectMetrics(): Promise<void> {
    const connectedPeers = this.webrtcHandler.getConnectedPeers()
    
    for (const peerId of connectedPeers) {
      try {
        const stats = await this.webrtcHandler.getNetworkStats(peerId)
        const status = this.webrtcHandler.getConnectionStatus(peerId)
        
        if (stats && status) {
          const quality = this.calculateNetworkQuality(stats)
          
          const metrics: NetworkMetrics = {
            peerId,
            quality,
            stats,
            status,
            timestamp: Date.now(),
          }

          this.recordMetrics(peerId, metrics)
          this.analyzeAndAdapt(peerId, metrics)
        }
      } catch (error) {
        console.error(`Failed to collect metrics for peer ${peerId}:`, error)
      }
    }
  }

  /**
   * Calculate network quality based on stats
   */
  private calculateNetworkQuality(stats: NetworkStats): NetworkQuality {
    const { latency, packetLoss, jitter } = stats
    
    // Weight different factors
    let score = 100
    
    // Latency impact (0-40 points)
    if (latency > 200) score -= 40
    else if (latency > 100) score -= 20
    else if (latency > 50) score -= 10
    
    // Packet loss impact (0-30 points)
    if (packetLoss > 5) score -= 30
    else if (packetLoss > 2) score -= 15
    else if (packetLoss > 1) score -= 5
    
    // Jitter impact (0-20 points)
    if (jitter > 50) score -= 20
    else if (jitter > 20) score -= 10
    else if (jitter > 10) score -= 5
    
    // Convert score to quality
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'fair'
    return 'poor'
  }

  /**
   * Record metrics in history
   */
  private recordMetrics(peerId: string, metrics: NetworkMetrics): void {
    if (!this.metricsHistory.has(peerId)) {
      this.metricsHistory.set(peerId, [])
    }
    
    const history = this.metricsHistory.get(peerId)!
    history.push(metrics)
    
    // Limit history size
    if (history.length > this.HISTORY_LIMIT) {
      history.shift()
    }
    
    // Notify quality change
    const previousMetrics = history[history.length - 2]
    if (previousMetrics && previousMetrics.quality !== metrics.quality) {
      this.onQualityChangeCallback?.(peerId, metrics.quality, metrics)
    }
  }

  /**
   * Analyze metrics and adapt settings
   */
  private analyzeAndAdapt(peerId: string, currentMetrics: NetworkMetrics): void {
    const history = this.metricsHistory.get(peerId) || []
    if (history.length < 3) return // Need some history for analysis
    
    const recentMetrics = history.slice(-5) // Last 5 measurements
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.stats.latency, 0) / recentMetrics.length
    const avgPacketLoss = recentMetrics.reduce((sum, m) => sum + m.stats.packetLoss, 0) / recentMetrics.length
    
    const newSettings = { ...this.adaptiveSettings }
    let settingsChanged = false
    
    // Enable lag compensation for high latency
    if (avgLatency > 150 && !newSettings.enableLagCompensation) {
      newSettings.enableLagCompensation = true
      settingsChanged = true
    } else if (avgLatency < 100 && newSettings.enableLagCompensation) {
      newSettings.enableLagCompensation = false
      settingsChanged = true
    }
    
    // Reduce quality for poor connections
    if (currentMetrics.quality === 'poor' && !newSettings.reducedQuality) {
      newSettings.reducedQuality = true
      settingsChanged = true
    } else if (currentMetrics.quality === 'excellent' && newSettings.reducedQuality) {
      newSettings.reducedQuality = false
      settingsChanged = true
    }
    
    // Prioritize stability for unstable connections
    if (avgPacketLoss > 2 && !newSettings.prioritizeStability) {
      newSettings.prioritizeStability = true
      newSettings.maxRetransmissions = 5
      settingsChanged = true
    } else if (avgPacketLoss < 1 && newSettings.prioritizeStability) {
      newSettings.prioritizeStability = false
      newSettings.maxRetransmissions = 3
      settingsChanged = true
    }
    
    if (settingsChanged) {
      this.adaptiveSettings = newSettings
      this.onAdaptiveChangeCallback?.(newSettings)
      console.log(`Adaptive settings updated for peer ${peerId}:`, newSettings)
    }
  }

  /**
   * Get current metrics for a peer
   */
  getCurrentMetrics(peerId: string): NetworkMetrics | null {
    const history = this.metricsHistory.get(peerId)
    return history?.[history.length - 1] || null
  }

  /**
   * Get metrics history for a peer
   */
  getMetricsHistory(peerId: string): NetworkMetrics[] {
    return this.metricsHistory.get(peerId) || []
  }

  /**
   * Get average metrics over time period
   */
  getAverageMetrics(peerId: string, timeWindowMs = 30000): NetworkStats | null {
    const history = this.metricsHistory.get(peerId) || []
    const cutoff = Date.now() - timeWindowMs
    const recentMetrics = history.filter(m => m.timestamp > cutoff)
    
    if (recentMetrics.length === 0) return null
    
    const avgStats = recentMetrics.reduce(
      (acc, metrics) => ({
        latency: acc.latency + metrics.stats.latency,
        packetLoss: acc.packetLoss + metrics.stats.packetLoss,
        bandwidth: acc.bandwidth + metrics.stats.bandwidth,
        jitter: acc.jitter + metrics.stats.jitter,
        lastUpdated: Math.max(acc.lastUpdated, metrics.stats.lastUpdated),
      }),
      { latency: 0, packetLoss: 0, bandwidth: 0, jitter: 0, lastUpdated: 0 }
    )
    
    const count = recentMetrics.length
    return {
      latency: avgStats.latency / count,
      packetLoss: avgStats.packetLoss / count,
      bandwidth: avgStats.bandwidth / count,
      jitter: avgStats.jitter / count,
      lastUpdated: avgStats.lastUpdated,
    }
  }

  /**
   * Get current adaptive settings
   */
  getAdaptiveSettings(): AdaptiveSettings {
    return { ...this.adaptiveSettings }
  }

  /**
   * Manually update adaptive settings
   */
  updateAdaptiveSettings(settings: Partial<AdaptiveSettings>): void {
    this.adaptiveSettings = { ...this.adaptiveSettings, ...settings }
    this.onAdaptiveChangeCallback?.(this.adaptiveSettings)
  }

  /**
   * Get network quality summary for all peers
   */
  getNetworkSummary(): { [peerId: string]: NetworkQuality } {
    const summary: { [peerId: string]: NetworkQuality } = {}
    
    this.metricsHistory.forEach((history, peerId) => {
      const latest = history[history.length - 1]
      if (latest) {
        summary[peerId] = latest.quality
      }
    })
    
    return summary
  }

  /**
   * Check if network conditions are suitable for gameplay
   */
  isNetworkSuitableForGameplay(): boolean {
    const connectedPeers = this.webrtcHandler.getConnectedPeers()
    
    for (const peerId of connectedPeers) {
      const metrics = this.getCurrentMetrics(peerId)
      if (!metrics) continue
      
      // Check if any peer has poor connection
      if (metrics.quality === 'poor') {
        return false
      }
      
      // Check critical thresholds
      if (metrics.stats.latency > 500 || metrics.stats.packetLoss > 10) {
        return false
      }
    }
    
    return true
  }

  /**
   * Set callback for quality changes
   */
  onQualityChange(callback: (peerId: string, quality: NetworkQuality, metrics: NetworkMetrics) => void): void {
    this.onQualityChangeCallback = callback
  }

  /**
   * Set callback for adaptive setting changes
   */
  onAdaptiveChange(callback: (settings: AdaptiveSettings) => void): void {
    this.onAdaptiveChangeCallback = callback
  }

  /**
   * Clear all metrics history
   */
  clearHistory(): void {
    this.metricsHistory.clear()
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalPeers: number
    activePeers: number
    averageLatency: number
    worstQuality: NetworkQuality
  } {
    const connectedPeers = this.webrtcHandler.getConnectedPeers()
    let totalLatency = 0
    let worstQuality: NetworkQuality = 'excellent'
    let activePeers = 0
    
    for (const peerId of connectedPeers) {
      const metrics = this.getCurrentMetrics(peerId)
      if (metrics) {
        activePeers++
        totalLatency += metrics.stats.latency
        
        // Determine worst quality
        const qualityOrder = { excellent: 4, good: 3, fair: 2, poor: 1 }
        if (qualityOrder[metrics.quality] < qualityOrder[worstQuality]) {
          worstQuality = metrics.quality
        }
      }
    }
    
    return {
      totalPeers: connectedPeers.length,
      activePeers,
      averageLatency: activePeers > 0 ? totalLatency / activePeers : 0,
      worstQuality,
    }
  }
}