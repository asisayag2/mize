import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getImageUrl } from '../utils/cloudinary'
import './DirectVotePage.css'

export default function DirectVotePage() {
  const displayName = useStore(state => state.displayName)
  const contenders = useStore(state => state.contenders)
  const cloudName = useStore(state => state.cloudName)
  const activeCycle = useStore(state => state.activeCycle)
  const voteStatus = useStore(state => state.voteStatus)
  const fetchConfig = useStore(state => state.fetchConfig)
  const fetchContenders = useStore(state => state.fetchContenders)
  const fetchVoteStatus = useStore(state => state.fetchVoteStatus)
  const submitVote = useStore(state => state.submitVote)
  const loadDisplayName = useStore(state => state.loadDisplayName)
  const setDisplayName = useStore(state => state.setDisplayName)
  const initDeviceToken = useStore(state => state.initDeviceToken)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isChangingVote, setIsChangingVote] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const activeContenders = contenders.filter(c => c.status === 'active')
  const maxVotes = activeCycle?.maxVotesPerUser || 3

  useEffect(() => {
    const init = async () => {
      loadDisplayName()
      initDeviceToken()
      await fetchConfig()
      await fetchContenders()
      await fetchVoteStatus()
      setIsLoading(false)
    }
    init()
  }, [loadDisplayName, initDeviceToken, fetchConfig, fetchContenders, fetchVoteStatus])

  // Pre-select previous vote selections when changing vote
  useEffect(() => {
    if (voteStatus?.hasVoted && voteStatus.vote?.selections) {
      const previousIds = voteStatus.vote.selections.map(s => s.id)
      setSelectedIds(previousIds)
      setIsChangingVote(true)
    }
  }, [voteStatus])

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id))
      setError('')
    } else {
      if (selectedIds.length >= maxVotes) {
        setError(`אפשר לבחור עד ${maxVotes} מתמודדים`)
        return
      }
      setSelectedIds(prev => [...prev, id])
      setError('')
    }
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nameInput.trim()) {
      setDisplayName(nameInput.trim())
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('נא לבחור לפחות מתמודד אחד')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const result = await submitVote(selectedIds)
      
      if (result) {
        setSuccess(true)
      } else {
        setError('שגיאה בשליחת ההצבעה. נסה שוב.')
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'שגיאה בשליחת ההצבעה'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="direct-vote-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  // No active voting cycle
  if (!activeCycle) {
    return (
      <div className="direct-vote-page">
        <div className="direct-vote-container">
          <div className="direct-vote-message">
            <span className="message-icon">🗳️</span>
            <h1>אין הצבעה פעילה כרגע</h1>
            <p>חזרו מאוחר יותר כשתיפתח הצבעה חדשה</p>
            <Link to="/app" className="btn btn-primary">
              לדף הראשי
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Name input screen
  if (!displayName) {
    return (
      <div className="direct-vote-page">
        <div className="direct-vote-container">
          <div className="direct-vote-welcome">
            <h1>🎭 מי-זה?</h1>
            <p className="welcome-subtitle">הצבעה למתמודד האהוב</p>
            <form onSubmit={handleNameSubmit} className="name-form">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="מה השם שלך?"
                className="input name-input"
                autoFocus
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={!nameInput.trim()}
              >
                בואו נתחיל!
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="direct-vote-page">
        <div className="direct-vote-container">
          <div className="direct-vote-success">
            <span className="success-icon">🎉</span>
            <h2>{isChangingVote ? 'ההצבעה עודכנה!' : 'תודה שהצבעת!'}</h2>
            <p>{isChangingVote ? 'ההצבעה שלך עודכנה בהצלחה' : 'ההצבעה נקלטה בהצלחה'}</p>
            <div className="voted-selections">
              <p>הבחירות שלך:</p>
              <ul>
                {selectedIds.map(id => {
                  const contender = contenders.find(c => c.id === id)
                  return contender ? <li key={id}>{contender.nickname}</li> : null
                })}
              </ul>
            </div>
            <div className="success-actions">
              <Link to="/app" className="btn btn-primary">
                לדף הראשי
              </Link>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSuccess(false)
                  setIsChangingVote(true)
                }}
              >
                שנה את ההצבעה
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="direct-vote-page">
      <div className="direct-vote-container">
        {/* Header */}
        <header className="direct-vote-header">
          <div className="header-title">
            <h1>🗳️ הצביעו למתמודד האהוב</h1>
          </div>
        </header>

        {/* Instructions */}
        <div className="direct-vote-instructions">
          {isChangingVote && (
            <p className="change-vote-hint">הבחירות הקודמות שלך מסומנות. ניתן לשנות אותן.</p>
          )}
          <p className="instruction-text">
            בחרו עד <strong>{maxVotes}</strong> מתמודדים
            <span className="selection-badge">{selectedIds.length} / {maxVotes}</span>
          </p>
        </div>

        {/* Contenders grid */}
        <div className="direct-vote-grid">
          {activeContenders.map(contender => {
            const isSelected = selectedIds.includes(contender.id)
            const imageUrl = getImageUrl(cloudName, contender.imagePublicId, {
              width: 300,
              height: 375,
              crop: 'fill',
              quality: 'auto',
              format: 'auto',
            })

            return (
              <div key={contender.id} className={`direct-vote-card ${isSelected ? 'selected' : ''}`}>
                <div className="card-image-container" onClick={() => toggleSelection(contender.id)}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={contender.nickname} className="card-image" />
                  ) : (
                    <div className="card-placeholder">🎭</div>
                  )}
                  {isSelected && (
                    <div className="card-check">
                      <span>✓</span>
                    </div>
                  )}
                  <div className="card-select-overlay">
                    <span>{isSelected ? 'הסר בחירה' : 'בחר'}</span>
                  </div>
                </div>
                <div className="card-info">
                  <h3 className="card-name">{contender.nickname}</h3>
                  <Link 
                    to={`/contender/${contender.id}?from=vote-now`} 
                    className="card-details-link"
                  >
                    צפה בפרטים
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && <p className="direct-vote-error">{error}</p>}

        {/* Sticky Submit */}
        <div className="direct-vote-submit">
          <button
            className="btn btn-primary btn-large submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.length === 0}
          >
            {isSubmitting ? 'שולח...' : isChangingVote ? 'עדכן הצבעה' : `הצביעו (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
