import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import './SplashPage.css'

export default function SplashPage() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const setDisplayName = useStore(state => state.setDisplayName)
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('השם חייב להכיל לפחות 2 תווים')
      return
    }

    setDisplayName(trimmedName)
    navigate('/app')
  }

  return (
    <div className="splash-page">
      <div className="splash-content">
        {/* Logo / Title */}
        <div className="splash-logo">
          <div className="logo-mask">🎭</div>
          <h1 className="splash-title">מי-זה?</h1>
          <p className="splash-subtitle">תחרות הזמר במסכה</p>
        </div>

        {/* Name form */}
        <form className="splash-form" onSubmit={handleSubmit}>
          <label className="splash-label" htmlFor="name">
            מה השם שלך?
          </label>
          <input
            id="name"
            type="text"
            className="input splash-input"
            placeholder="הכנס את שמך..."
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            autoComplete="off"
            autoFocus
          />
          {error && <p className="splash-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-large splash-btn">
            המשך
          </button>
        </form>

        {/* Decorative elements */}
        <div className="splash-decoration">
          <span className="decoration-note">🎵</span>
          <span className="decoration-star">✨</span>
          <span className="decoration-mic">🎤</span>
        </div>
      </div>
    </div>
  )
}

