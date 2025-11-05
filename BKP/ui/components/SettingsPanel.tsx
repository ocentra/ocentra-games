import React, { useState } from 'react'
import './SettingsPanel.css'

interface Settings {
  musicVolume: number;
  soundEffectsVolume: number;
  showAnimations: boolean;
  cardQuality: 'low' | 'medium' | 'high';
  enableHints: boolean;
}

interface SettingsPanelProps {
  onClose: () => void
  onSave: (settings: Settings) => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  onSave
}) => {
  const [settings, setSettings] = useState<Settings>({
    musicVolume: 80,
    soundEffectsVolume: 100,
    showAnimations: true,
    cardQuality: 'high',
    enableHints: true
  })

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const handleInputChange = <T extends keyof Settings>(field: T, value: Settings[T]) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="settings-panel-overlay">
      <div className="settings-panel">
        <div className="panel-header">
          <h2>Game Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="setting-group">
            <h3>Audio</h3>
            <div className="setting-item">
              <label htmlFor="musicVolume">Music Volume</label>
              <input
                id="musicVolume"
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={(e) => handleInputChange('musicVolume', parseInt(e.target.value))}
                aria-label="Music Volume"
              />
              <span>{settings.musicVolume}%</span>
            </div>
            
            <div className="setting-item">
              <label htmlFor="soundEffectsVolume">Sound Effects Volume</label>
              <input
                id="soundEffectsVolume"
                type="range"
                min="0"
                max="100"
                value={settings.soundEffectsVolume}
                onChange={(e) => handleInputChange('soundEffectsVolume', parseInt(e.target.value))}
                aria-label="Sound Effects Volume"
              />
              <span>{settings.soundEffectsVolume}%</span>
            </div>
          </div>
          
          <div className="setting-group">
            <h3>Visual</h3>
            <div className="setting-item">
              <label htmlFor="cardQuality">Card Quality</label>
              <select
                id="cardQuality"
                value={settings.cardQuality}
                onChange={(e) => handleInputChange('cardQuality', e.target.value as 'low' | 'medium' | 'high')}
                aria-label="Card Quality"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="setting-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showAnimations}
                  onChange={(e) => handleInputChange('showAnimations', e.target.checked)}
                />
                Show Animations
              </label>
            </div>
          </div>
          
          <div className="setting-group">
            <h3>Gameplay</h3>
            <div className="setting-item checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.enableHints}
                  onChange={(e) => handleInputChange('enableHints', e.target.checked)}
                />
                Enable Hints
              </label>
            </div>
          </div>
        </div>
        
        <div className="panel-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="save-button" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}