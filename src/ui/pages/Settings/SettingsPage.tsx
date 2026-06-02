import { useEffect, useMemo, useState } from 'react'
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent'
import { AppScreenToken } from '@/ui/navigation/appRoutes'
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader'
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell'
import { SettingsPageContent, SettingsPageToolbar, type AppPageSvgControls } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces'
import { APP_VERSION } from '@/constants/version'
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps'
import { DesktopCheckForUpdates } from '@/ui/components/DesktopCheckForUpdates/DesktopCheckForUpdates'
import { loadPageLayoutData, recordOf } from '@/ui/pages/pageLayoutData'

type TabType = 'models' | 'inference' | 'providers' | 'native' | 'assets'

const SETTINGS_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/SettingsPageLayout.asset'

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
  const [layoutControls, setLayoutControls] = useState<Partial<AppPageSvgControls> | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPageLayoutData(SETTINGS_PAGE_LAYOUT_ASSET_PATH)
      .then((data) => {
        if (cancelled) return
        const controls = recordOf(data?.pageControls)
        setLayoutControls(Object.keys(controls).length > 0 ? controls as Partial<AppPageSvgControls> : null)
      })
      .catch(() => {
        if (!cancelled) setLayoutControls(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
            right: headerProps.rightConfig,
          }}
        />
      }
      toolbar={
        <SettingsPageToolbar
          activeTab={activeTab}
          showAssetsTab={showAssetsTab}
          onTabChange={setActiveTab}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <SettingsPageContent
        activeTab={activeTab}
        showAssetsTab={showAssetsTab}
        layoutControls={layoutControls}
        footer={
          <DesktopCheckForUpdates />
        }
      />
    </UnifiedPageShell>
  )
}

