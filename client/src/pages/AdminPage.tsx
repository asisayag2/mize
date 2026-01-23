import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useStore } from '../store/useStore'
import AdminLogin from '../components/admin/AdminLogin'
import ContendersManager from '../components/admin/ContendersManager'
import CyclesManager from '../components/admin/CyclesManager'
import './AdminPage.css'

type Tab = 'contenders' | 'cycles'

export default function AdminPage() {
  const fetchConfig = useStore(state => state.fetchConfig)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('contenders')

  useEffect(() => {
    fetchConfig() // Fetch cloudName for previews
    checkAdminStatus()
  }, [fetchConfig])

  const checkAdminStatus = async () => {
    try {
      const { isAdmin } = await api.getAdminStatus()
      setIsAdmin(isAdmin)
    } catch {
      setIsAdmin(false)
    }
  }

  const handleLogin = () => {
    setIsAdmin(true)
  }

  const handleLogout = async () => {
    try {
      await api.adminLogout()
      setIsAdmin(false)
    } catch {
      // Ignore error, just reload
      window.location.reload()
    }
  }

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="admin-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  // Login required
  if (!isAdmin) {
    return (
      <div className="admin-page">
        <AdminLogin onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>ניהול מי-זה? 🎭</h1>
          <button className="btn btn-secondary" onClick={handleLogout}>
            התנתק
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'contenders' ? 'active' : ''}`}
          onClick={() => setActiveTab('contenders')}
        >
          ניהול מתמודדים
        </button>
        <button
          className={`admin-tab ${activeTab === 'cycles' ? 'active' : ''}`}
          onClick={() => setActiveTab('cycles')}
        >
          ניהול סבבי הצבעה
        </button>
      </div>

      {/* Content */}
      <main className="admin-content">
        {activeTab === 'contenders' && <ContendersManager />}
        {activeTab === 'cycles' && <CyclesManager />}
      </main>
    </div>
  )
}

