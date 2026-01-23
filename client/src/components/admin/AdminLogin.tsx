import { useState, FormEvent } from 'react'
import { api } from '../../api/client'
import './AdminLogin.css'

interface AdminLoginProps {
  onLogin: () => void
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('נא להזין סיסמה')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await api.adminLogin(password)
      onLogin()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = err.response as { data?: { error?: string } }
        setError(response.data?.error || 'סיסמה שגויה')
      } else {
        setError('שגיאה בהתחברות')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1>ניהול מי-זה? 🎭</h1>
        <p className="admin-login-subtitle">התחברות למערכת הניהול</p>
        
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="הזן סיסמת מנהל..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            autoFocus
            disabled={isLoading}
          />
          {error && <p className="admin-login-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  )
}

