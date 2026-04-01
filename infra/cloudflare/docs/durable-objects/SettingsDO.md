# SettingsDO

**Purpose:** Per-user settings: get (theme, notifications, soundEnabled, language, etc.), update (partial patch). UserSettings: theme (light/dark/auto), notifications, soundEnabled, language, extensible key-value.

**Shard key:** userId.

**HTTP surface:** GET `/${SettingsDOSegment.Get}`; POST `/${SettingsDOSegment.Update}` (body partial UserSettings).

**Message types:** N/A (HTTP only).

**Storage:** SettingsDOStoragePrefix.Settings (boundary-domain): UserSettings object.

**Handlers:** handleSettingsRequest (feature-handlers.ts).

**Domain constants:** endpoint-domain: SettingsDOSegment, Http*; boundary-domain: SettingsDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant SettingsDO
  Handler->>SettingsDO: fetch Get or Update
  SettingsDO->>SettingsDO: getSettings/updateSettings; storage
  SettingsDO-->>Handler: JSON
```
