import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import './SettingsManager.css'

interface AppConfig {
  showLikeButton: boolean
}

export default function SettingsManager() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const data = await api.getAppConfig()
      setConfig(data)
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (key: keyof AppConfig) => {
    if (!config || isSaving) return

    const newValue = !config[key]
    setIsSaving(true)

    try {
      const updated = await api.updateAppConfig({ [key]: newValue })
      setConfig(updated)
    } catch (error) {
      console.error('Failed to update config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="settings-manager">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="settings-manager">
        <p className="admin-empty">שגיאה בטעינת ההגדרות</p>
      </div>
    )
  }

  return (
    <div className="settings-manager">
      <h2>הגדרות אפליקציה</h2>

      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <h3>כפתור לייק</h3>
            <p>הצג/הסתר את כפתור הלייק (❤️) באפליקציה הראשית</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config.showLikeButton}
              onChange={() => handleToggle('showLikeButton')}
              disabled={isSaving}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  )
}
