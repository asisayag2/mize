import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getImageUrl } from '../utils/cloudinary'
import './VotePage.css'

export default function VotePage() {
  const navigate = useNavigate()
  const contenders = useStore(state => state.contenders)
  const cloudName = useStore(state => state.cloudName)
  const activeCycle = useStore(state => state.activeCycle)
  const voteStatus = useStore(state => state.voteStatus)
  const fetchContenders = useStore(state => state.fetchContenders)
  const fetchVoteStatus = useStore(state => state.fetchVoteStatus)
  const submitVote = useStore(state => state.submitVote)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isChangingVote, setIsChangingVote] = useState(false)

  const activeContenders = contenders.filter(c => c.status === 'active')
  const maxVotes = activeCycle?.maxVotesPerUser || 3

  useEffect(() => {
    fetchContenders()
    fetchVoteStatus()
  }, [fetchContenders, fetchVoteStatus])

  // Pre-select previous vote selections when changing vote
  useEffect(() => {
    if (voteStatus?.hasVoted && voteStatus.vote?.selections) {
      const previousIds = voteStatus.vote.selections.map(s => s.id)
      setSelectedIds(previousIds)
      setIsChangingVote(true)
    }
  }, [voteStatus])

  // Redirect if no active cycle
  useEffect(() => {
    if (voteStatus && !voteStatus.activeCycle) {
      navigate('/app')
    }
  }, [voteStatus, navigate])

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

  // Success state - show first after submitting a vote
  if (success) {
    return (
      <div className="vote-page">
        <div className="vote-container">
          <div className="vote-success">
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
            <button className="btn btn-primary" onClick={() => navigate('/app')}>
              חזרה לראשי
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Note: "already voted" blocking screen removed - users can now change their vote

  return (
    <div className="vote-page">
      <div className="vote-container">
        {/* Header */}
        <header className="vote-header">
          <button className="btn-back" onClick={() => navigate('/app')}>
            ← חזרה
          </button>
          <h1>{isChangingVote ? 'שינוי הצבעה' : 'הצבעה'}</h1>
        </header>

        {/* Instructions */}
        <div className="vote-instructions">
          {isChangingVote && (
            <p className="change-vote-hint">הבחירות הקודמות שלך מסומנות. ניתן לשנות אותן.</p>
          )}
          <p>בחר עד <strong>{maxVotes}</strong> מתמודדים</p>
          <p className="selection-count">
            נבחרו: {selectedIds.length} / {maxVotes}
          </p>
        </div>

        {/* Contenders grid */}
        <div className="vote-grid">
          {activeContenders.map(contender => {
            const isSelected = selectedIds.includes(contender.id)
            const imageUrl = getImageUrl(cloudName, contender.imagePublicId, {
              width: 200,
              height: 250,
              crop: 'fill',
              quality: 'auto',
              format: 'auto',
            })

            return (
              <button
                key={contender.id}
                className={`vote-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelection(contender.id)}
              >
                <div className="vote-card-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={contender.nickname} />
                  ) : (
                    <div className="vote-card-placeholder">🎭</div>
                  )}
                  {isSelected && (
                    <div className="vote-card-check">✓</div>
                  )}
                </div>
                <span className="vote-card-name">{contender.nickname}</span>
              </button>
            )
          })}
        </div>

        {/* Error */}
        {error && <p className="vote-error">{error}</p>}

        {/* Submit */}
        <div className="vote-submit">
          <button
            className="btn btn-primary btn-large"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.length === 0}
          >
            {isSubmitting ? 'שולח...' : isChangingVote ? 'עדכן הצבעה' : 'הצבע'}
          </button>
        </div>
      </div>
    </div>
  )
}

