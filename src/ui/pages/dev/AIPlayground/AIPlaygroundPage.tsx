import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { EditorPageHeader } from '@ocentra/core-ui';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { AppFooter } from '@/ui/components/AppFooter'
import { useAuth } from '@/providers/AuthProvider'
import { useAdminPermissions } from '@/hooks/useAdminPermissions'
import { useAuthHandlers } from '@/hooks/useAuthHandlers'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import '../AIPlaygroundPage.css'

const log = MainAppLogger.instance
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled)
  }
}
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)
import LoginDialog from '@/ui/components/Auth/LoginDialog'
import { ModelSelector } from './ModelSelector'
import { ChatPanel } from './ChatPanel'
import { GameRulesTestPanel } from './GameRulesTestPanel'
import { MetricsPanel } from './MetricsPanel'

/**
 * AIPlaygroundPage
 * 
 * Dev-only AI testing playground:
 * - Left: Model selector and controls
 * - Center: Chat interface
 * - Right: Game rules testing panel
 * - Bottom: Performance metrics
 */
export const AIPlaygroundPage: React.FC = () => {
  const navigate = useNavigate();
  const headerProps = useCoreUIHeaderProps();
  const { user, logout, login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest, sendPasswordReset } = useAuth();
  const { isAdmin } = useAdminPermissions()
  const isDevAuthBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_AI_PLAYGROUND_ALLOW_NON_ADMIN === '1'
  const hasPlaygroundAccess = isDevAuthBypassEnabled || Boolean(user && isAdmin)
  
  const handleWalletLogin = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Please connect your wallet in the login dialog' }
  }
  const authHandlers = useAuthHandlers(login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest, handleWalletLogin)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedQuantPath, setSelectedQuantPath] = useState<string | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadProgress, setModelLoadProgress] = useState<{
    progress: number
    status: 'initiate' | 'progress' | 'done' | 'error'
    message?: string
  } | null>(null)
  const [metrics, setMetrics] = useState<{
    ttft?: number
    tps?: string
    numTokens?: number
  }>({})
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isDev = import.meta.env.DEV
    const isProd = import.meta.env.PROD || import.meta.env.CF_PAGES === '1'

    if (!isDev && !isProd) {
      window.location.href = '/'
      return
    }

    if (isDevAuthBypassEnabled) {
      logWarn('[AIPlaygroundPage] Dev auth bypass enabled')
    } else if (!isAdmin && user) {
      logWarn('[AIPlaygroundPage] Access denied - admin only', { 
        data: { email: user.email, isAdmin: user.isAdmin } 
      })
    } else if (isAdmin) {
      logInfo('[AIPlaygroundPage] Admin access granted', { data: { email: user?.email } })
    }
  }, [isAdmin, user, isDevAuthBypassEnabled])

  if (!hasPlaygroundAccess) {
    return (
      <LoginDialog
        onLogin={authHandlers.login}
        onSignUp={authHandlers.signUp}
        onFacebookLogin={authHandlers.facebookLogin}
        onGoogleLogin={authHandlers.googleLogin}
        onGuestLogin={authHandlers.guestLogin}
        onWalletLogin={authHandlers.walletLogin}
        onSendPasswordReset={sendPasswordReset}
        onTabSwitch={() => {}}
        adminRequired={!isDevAuthBypassEnabled}
        adminMessage={
          isDevAuthBypassEnabled
            ? 'Sign in with any account or continue as guest to access AI Playground in local dev bypass mode.'
            : 'You need to be an administrator to access this page. Please sign in with an admin account.'
        }
      />
    )
  }

  return (
    <div className="ai-playground" ref={containerRef}>
      <EditorPageHeader
        {...headerProps}
        user={user}
        onLogout={logout}
        title="AI Playground"
        subtitle="Models · Chat · Rules"
        onHomeClick={() => navigate('/admin')}
        onAdminDashboardClick={() => navigate('/admin')}
      />

      <div className="ai-playground__main">
        <div className="ai-playground__content">
          {/* Left Panel: Model Selector */}
          <div className="ai-playground__left-panel">
            <ModelSelector
              selectedModelId={selectedModelId}
              selectedQuantPath={selectedQuantPath}
              onModelSelect={setSelectedModelId}
              onQuantSelect={setSelectedQuantPath}
              isModelLoading={isModelLoading}
              onLoadingChange={setIsModelLoading}
              onLoadProgress={setModelLoadProgress}
            />
          </div>

          {/* Center Panel: Chat */}
          <div className="ai-playground__center-panel">
            <ChatPanel
              modelId={selectedModelId}
              quantPath={selectedQuantPath}
              onMetricsUpdate={setMetrics}
            />
          </div>

          {/* Right Panel: Game Rules Test */}
          <div className="ai-playground__right-panel">
            <GameRulesTestPanel
              modelId={selectedModelId}
              quantPath={selectedQuantPath}
              onMetricsUpdate={setMetrics}
            />
          </div>
        </div>

        {/* Bottom Panel: Metrics */}
        <div className="ai-playground__bottom-panel">
          <MetricsPanel
            metrics={metrics}
            loadProgress={modelLoadProgress}
            isModelLoading={isModelLoading}
          />
        </div>
      </div>
      
      <AppFooter />
    </div>
  )
}
