import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import SplashPage from './pages/SplashPage'
import MainPage from './pages/MainPage'
import VotePage from './pages/VotePage'
import ContenderPage from './pages/ContenderPage'
import AdminPage from './pages/AdminPage'

function App() {
  const displayName = useStore(state => state.displayName)
  const loadDisplayName = useStore(state => state.loadDisplayName)
  const initDeviceToken = useStore(state => state.initDeviceToken)

  useEffect(() => {
    loadDisplayName()
    initDeviceToken()
  }, [loadDisplayName, initDeviceToken])

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/" 
          element={displayName ? <Navigate to="/app" replace /> : <SplashPage />} 
        />
        <Route 
          path="/app" 
          element={displayName ? <MainPage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/vote" 
          element={displayName ? <VotePage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/contender/:id" 
          element={displayName ? <ContenderPage /> : <Navigate to="/" replace />} 
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App

