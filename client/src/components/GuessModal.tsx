import { useState, useEffect, FormEvent } from 'react'
import { useStore } from '../store/useStore'
import './GuessModal.css'

interface GuessModalProps {
  contenderId: string
  onClose: () => void
}

export default function GuessModal({ contenderId, onClose }: GuessModalProps) {
  const [guess, setGuess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const submitGuess = useStore(state => state.submitGuess)
  const contenders = useStore(state => state.contenders)
  
  const contender = contenders.find(c => c.id === contenderId)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    const trimmedGuess = guess.trim()
    if (!trimmedGuess) {
      setError('נא להזין ניחוש')
      return
    }

    setIsSubmitting(true)
    setError('')

    const result = await submitGuess(contenderId, trimmedGuess)
    
    setIsSubmitting(false)
    
    if (result) {
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } else {
      setError('שגיאה בשליחת הניחוש. נסה שוב.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content guess-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>נחש מי זה?</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {contender && (
            <p className="guess-contender-name">
              מי מסתתר מאחורי <strong>{contender.nickname}</strong>?
            </p>
          )}
          
          {success ? (
            <div className="guess-success">
              <span className="success-icon">✓</span>
              <p>הניחוש נשלח בהצלחה!</p>
            </div>
          ) : (
            <form className="guess-form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="input"
                placeholder="מה הניחוש שלך?"
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value)
                  setError('')
                }}
                autoFocus
                disabled={isSubmitting}
              />
              {error && <p className="guess-error">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !guess.trim()}
              >
                {isSubmitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

