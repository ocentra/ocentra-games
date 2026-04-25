import { useMemo, useState } from 'react'
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent'
import { AppScreenToken } from '@/ui/navigation/appRoutes'
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader'
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell'
import { APP_VERSION } from '@/constants/version'
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps'
import { ModelSelectionTab } from './tabs/ModelSelectionTab'
import { InferenceSettingsTab } from './tabs/InferenceSettingsTab'
import { ProviderConfigTab } from './tabs/ProviderConfigTab'
import { NativeIntegrationTab } from './tabs/NativeIntegrationTab'
import { AssetDeliveryTab } from './tabs/AssetDeliveryTab'
import { DesktopCheckForUpdates } from '@/ui/components/DesktopCheckForUpdates/DesktopCheckForUpdates'
import './SettingsPage.css'

type TabType = 'models' | 'inference' | 'providers' | 'native' | 'assets'

export function SettingsPage() {
  const headerProps = useCoreUIHeaderProps()
  const showAssetsTab = useMemo(() => {
    if (import.meta.env.DEV) {
      return true
    }
    if (typeof window === 'undefined') {
      return false
    }
    return isLocalHostname(window.location.hostname)
  }, [])

  const [activeTab, setActiveTab] = useState<TabType>('models')

  const handleBack = () => {
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home))
  }

  return (
    <UnifiedPageShell
      className="settings-page"
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: 'Settings',
            tagline: 'Models, providers, native integrations, and asset delivery.',
          }}
          config={{
            left: {
              onClick: handleBack,
            },
            right: headerProps.user
              ? {
                  isProfile: true,
                  user: {
                    uid: headerProps.user.uid,
                    name: headerProps.user.displayName || 'Player',
                    email: headerProps.user.email ?? '',
                    avatarUrl: headerProps.user.photoURL
                      ? headerProps.getImageUrl(headerProps.user.photoURL)
                      : undefined,
                    isLoggedIn: true,
                    isAdmin: headerProps.user.isAdmin,
                  },
                  onLogout: headerProps.onLogout,
                  onAdminDashboardClick: headerProps.onAdminDashboardClick,
                  onUpdatePhoto: headerProps.onUpdatePhoto,
                  getAvatars: headerProps.getAvatars,
                }
              : undefined,
          }}
        />
      }
      toolbar={
        <div className="settings-toolbar">
          <button
            className={`settings-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
          <button
            className={`settings-tab ${activeTab === 'inference' ? 'active' : ''}`}
            onClick={() => setActiveTab('inference')}
          >
            Inference
          </button>
          <button
            className={`settings-tab ${activeTab === 'providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            Providers
          </button>
          <button
            className={`settings-tab ${activeTab === 'native' ? 'active' : ''}`}
            onClick={() => setActiveTab('native')}
          >
            Native
          </button>
          {showAssetsTab && (
            <button
              className={`settings-tab ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              Assets
            </button>
          )}
        </div>
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <main className="settings-page__work">
        <section className="settings-content">
          {activeTab === 'models' && <ModelSelectionTab />}
          {activeTab === 'inference' && <InferenceSettingsTab />}
          {activeTab === 'providers' && <ProviderConfigTab />}
          {activeTab === 'native' && <NativeIntegrationTab />}
          {activeTab === 'assets' && showAssetsTab && <AssetDeliveryTab />}
        </section>
        <div className="settings-footer">
          <DesktopCheckForUpdates />
        </div>
      </main>
    </UnifiedPageShell>
  )
}
