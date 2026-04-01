import { useMemo, useState } from 'react'
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent'
import { AppScreenToken } from '@/ui/navigation/appRoutes'
import { ModelSelectionTab } from './tabs/ModelSelectionTab'
import { InferenceSettingsTab } from './tabs/InferenceSettingsTab'
import { ProviderConfigTab } from './tabs/ProviderConfigTab'
import { NativeIntegrationTab } from './tabs/NativeIntegrationTab'
import { AssetDeliveryTab } from './tabs/AssetDeliveryTab'
import { DesktopCheckForUpdates } from '@/ui/components/DesktopCheckForUpdates/DesktopCheckForUpdates'
import './SettingsPage.css'

type TabType = 'models' | 'inference' | 'providers' | 'native' | 'assets'

export function SettingsPage() {
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
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={handleBack}>
          Back
        </button>
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-tabs">
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

      <div className="settings-content">
        {activeTab === 'models' && <ModelSelectionTab />}
        {activeTab === 'inference' && <InferenceSettingsTab />}
        {activeTab === 'providers' && <ProviderConfigTab />}
        {activeTab === 'native' && <NativeIntegrationTab />}
        {activeTab === 'assets' && showAssetsTab && <AssetDeliveryTab />}
      </div>
      <div className="settings-footer">
        <DesktopCheckForUpdates />
      </div>
    </div>
  )
}
