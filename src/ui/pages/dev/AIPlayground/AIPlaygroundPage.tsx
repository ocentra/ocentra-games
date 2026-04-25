import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import { APP_VERSION } from '@/constants/version'
import { useAuth } from '@/providers/AuthProvider'
import { useAdminPermissions } from '@/hooks/useAdminPermissions'
import { useAuthHandlers } from '@/hooks/useAuthHandlers'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import '../AIPlaygroundPage.css'

import LoginDialog from '@/ui/components/Auth/LoginDialog'
import { ModelSelector } from './ModelSelector'
import { ChatPanel } from './ChatPanel'
import { GameRulesTestPanel } from './GameRulesTestPanel'
import { MetricsPanel } from './MetricsPanel'

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
    }
    if (isAdmin) {
      logInfo('[AIPlaygroundPage] Admin access granted', { data: { email: user?.email } })
    }

    const hideLoading = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hideLoading?.();
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
      <UnifiedHeader
        profileName="main_screen"
        dynamicData={{
          gameName: 'AI Playground',
          tagline: 'Models | Chat | Rules',
        }}
        config={{
          left: {
            onClick: () => navigate('/admin'),
          },
          right: user
            ? {
                isProfile: true,
                user: {
                  uid: user.uid,
                  name: user.displayName || 'Player',
                  email: user.email ?? '',
                  avatarUrl: user.photoURL ? headerProps.getImageUrl(user.photoURL) : undefined,
                  isLoggedIn: true,
                  isAdmin: user.isAdmin,
                },
                onLogout: logout,
                onAdminDashboardClick: () => navigate('/admin'),
                onUpdatePhoto: headerProps.onUpdatePhoto,
                getAvatars: headerProps.getAvatars,
              }
            : undefined,
        }}
      />

      <div className="ai-playground__main">
        <div className="ai-playground__content">
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

          <div className="ai-playground__center-panel">
            <ChatPanel
              modelId={selectedModelId}
              quantPath={selectedQuantPath}
              onMetricsUpdate={setMetrics}
            />
          </div>

          <div className="ai-playground__right-panel">
            <GameRulesTestPanel
              modelId={selectedModelId}
              quantPath={selectedQuantPath}
              onMetricsUpdate={setMetrics}
            />
          </div>
        </div>

        <div className="ai-playground__bottom-panel">
          <MetricsPanel
            metrics={metrics}
            loadProgress={modelLoadProgress}
            isModelLoading={isModelLoading}
          />
        </div>
      </div>

      <GameFooter appVersion={APP_VERSION} />
    </div>
  )
}
