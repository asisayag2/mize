import { useState, useEffect, FormEvent } from 'react'
import { api } from '../../api/client'
import type { AdminCycle, CycleResults } from '../../types'
import './CyclesManager.css'

interface CycleFormData {
  startAt: string
  endAt: string
  maxVotesPerUser: number
}

const getDefaultForm = (): CycleFormData => {
  const now = new Date()
  const start = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000) // 25 hours from now
  
  return {
    startAt: start.toISOString().slice(0, 16),
    endAt: end.toISOString().slice(0, 16),
    maxVotesPerUser: 3,
  }
}

export default function CyclesManager() {
  const [cycles, setCycles] = useState<AdminCycle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CycleFormData>(getDefaultForm)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Results modal
  const [resultsModal, setResultsModal] = useState<CycleResults | null>(null)
  const [expandedVoters, setExpandedVoters] = useState<string | null>(null)

  useEffect(() => {
    loadCycles()
  }, [])

  const loadCycles = async () => {
    try {
      const data = await api.getAdminCycles()
      setCycles(data)
    } catch (error) {
      console.error('Failed to load cycles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData(getDefaultForm())
    setShowForm(true)
    setFormError('')
  }

  const handleCancel = () => {
    setShowForm(false)
    setFormData(getDefaultForm())
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const start = new Date(formData.startAt)
    const end = new Date(formData.endAt)

    if (start >= end) {
      setFormError('תאריך התחלה חייב להיות לפני תאריך סיום')
      return
    }

    if (formData.maxVotesPerUser < 1) {
      setFormError('מספר הצבעות מקסימלי חייב להיות לפחות 1')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      await api.createCycle({
        startAt: formData.startAt,
        endAt: formData.endAt,
        maxVotesPerUser: formData.maxVotesPerUser,
      })
      await loadCycles()
      handleCancel()
    } catch (error: unknown) {
      console.error('Failed to create cycle:', error)
      if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { data?: { error?: string } }
        setFormError(response.data?.error || 'שגיאה ביצירת סבב')
      } else {
        setFormError('שגיאה ביצירת סבב')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = async (id: string) => {
    if (!confirm('האם לסגור את סבב ההצבעה?')) return
    
    try {
      await api.closeCycle(id)
      await loadCycles()
    } catch (error) {
      console.error('Failed to close cycle:', error)
    }
  }

  const handleViewResults = async (id: string) => {
    try {
      const results = await api.getCycleResults(id)
      setResultsModal(results)
      setExpandedVoters(null)
    } catch (error) {
      console.error('Failed to load results:', error)
    }
  }

  const getStatusLabel = (status: AdminCycle['status']) => {
    const labels: Record<AdminCycle['status'], string> = {
      scheduled: 'מתוזמן',
      active: 'פעיל',
      ended: 'הסתיים',
      closed: 'נסגר ידנית',
    }
    return labels[status]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="cycles-manager">
      {/* Header */}
      <div className="admin-section-header">
        <h2 className="admin-section-title">סבבי הצבעה</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + צור סבב חדש
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-section">
          <h3>סבב הצבעה חדש</h3>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <div>
                <label>תאריך ושעת התחלה</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.startAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                />
              </div>
              <div>
                <label>תאריך ושעת סיום</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.endAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label>מספר הצבעות מקסימלי למשתמש</label>
              <input
                type="number"
                className="input"
                min="1"
                max="10"
                value={formData.maxVotesPerUser}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxVotesPerUser: parseInt(e.target.value) || 3 
                }))}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                ביטול
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'יוצר...' : 'צור סבב'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="admin-section">
        {cycles.length === 0 ? (
          <div className="admin-empty">אין סבבי הצבעה</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>התחלה</th>
                <th>סיום</th>
                <th>סטטוס</th>
                <th>מקס׳ הצבעות</th>
                <th>הצבעות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(cycle => (
                <tr key={cycle.id}>
                  <td>{formatDate(cycle.startAt)}</td>
                  <td>
                    {formatDate(cycle.endAt)}
                    {cycle.closedAt && (
                      <div className="closed-at">
                        (נסגר: {formatDate(cycle.closedAt)})
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${cycle.status}`}>
                      {getStatusLabel(cycle.status)}
                    </span>
                  </td>
                  <td>{cycle.maxVotesPerUser}</td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => handleViewResults(cycle.id)}
                    >
                      {cycle.voteCount} הצבעות
                    </button>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleViewResults(cycle.id)}
                      >
                        תוצאות
                      </button>
                      {cycle.status === 'active' && (
                        <button
                          className="btn btn-secondary danger"
                          onClick={() => handleClose(cycle.id)}
                        >
                          סגור עכשיו
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Results Modal */}
      {resultsModal && (
        <div className="modal-overlay" onClick={() => setResultsModal(null)}>
          <div className="modal-content results-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>תוצאות סבב הצבעה</h3>
              <button className="modal-close" onClick={() => setResultsModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="results-summary">
                <p>סה״כ הצבעות: <strong>{resultsModal.totalVotes}</strong></p>
                <p>מקס׳ בחירות: <strong>{resultsModal.maxVotesPerUser}</strong></p>
              </div>

              {resultsModal.results.length === 0 ? (
                <p className="admin-empty">אין הצבעות בסבב זה</p>
              ) : (
                <div className="results-list">
                  {resultsModal.results.map((result, index) => (
                    <div 
                      key={result.contender.id} 
                      className="result-item"
                    >
                      <div className="result-rank">#{index + 1}</div>
                      <div className="result-info">
                        <span className="result-name">{result.contender.nickname}</span>
                      </div>
                      <div className="result-votes">
                        <button
                          className="votes-count"
                          onClick={() => setExpandedVoters(
                            expandedVoters === result.contender.id ? null : result.contender.id
                          )}
                        >
                          {result.count} קולות
                        </button>
                        {expandedVoters === result.contender.id && (
                          <div className="voters-list">
                            {result.voters.map((voter, i) => (
                              <span key={i} className="voter-name">{voter}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

