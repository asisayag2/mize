import { useState, useEffect, FormEvent } from 'react'
import { api } from '../../api/client'
import { useStore } from '../../store/useStore'
import { getImageUrl, getVideoUrl } from '../../utils/cloudinary'
import type { AdminContender, ContenderStats } from '../../types'
import './ContendersManager.css'

interface ContenderFormData {
  nickname: string
  imagePublicId: string
  videos: Array<{ title: string; publicId: string }>
  isActive: boolean
}

const emptyForm: ContenderFormData = {
  nickname: '',
  imagePublicId: '',
  videos: [],
  isActive: true,
}

export default function ContendersManager() {
  const cloudName = useStore(state => state.cloudName)
  const [contenders, setContenders] = useState<AdminContender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ContenderFormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Stats modal
  const [statsModal, setStatsModal] = useState<ContenderStats | null>(null)
  
  // Preview states
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [imagePreviewError, setImagePreviewError] = useState(false)
  const [showVideoPreview, setShowVideoPreview] = useState<Record<number, boolean>>({})
  const [videoPreviewErrors, setVideoPreviewErrors] = useState<Record<number, boolean>>({})

  useEffect(() => {
    loadContenders()
  }, [])

  const loadContenders = async () => {
    try {
      const data = await api.getAdminContenders()
      setContenders(data)
    } catch (error) {
      console.error('Failed to load contenders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setFormError('')
    setShowImagePreview(false)
    setImagePreviewError(false)
    setShowVideoPreview({})
    setVideoPreviewErrors({})
  }

  const handleEdit = (contender: AdminContender) => {
    setFormData({
      nickname: contender.nickname,
      imagePublicId: contender.imagePublicId,
      videos: (contender.videos as Array<{ title: string; publicId: string }>) || [],
      isActive: contender.isActive,
    })
    setEditingId(contender.id)
    setShowForm(true)
    setFormError('')
    setShowImagePreview(false)
    setImagePreviewError(false)
    setShowVideoPreview({})
    setVideoPreviewErrors({})
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.nickname.trim()) {
      setFormError('נא להזין כינוי')
      return
    }
    if (!formData.imagePublicId.trim()) {
      setFormError('נא להזין מזהה תמונה')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      // Filter out empty video entries before saving
      const cleanedData = {
        ...formData,
        videos: formData.videos.filter(v => v.title.trim() && v.publicId.trim()),
      }
      
      if (editingId) {
        await api.updateContender(editingId, cleanedData)
      } else {
        await api.createContender(cleanedData)
      }
      await loadContenders()
      handleCancel()
    } catch (error: unknown) {
      console.error('Failed to save contender:', error)
      const axiosError = error as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'שגיאה בשמירת המתמודד'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק את המתמודד?')) return
    
    try {
      await api.deleteContender(id)
      await loadContenders()
    } catch (error) {
      console.error('Failed to delete contender:', error)
    }
  }

  const handleToggleActive = async (contender: AdminContender) => {
    try {
      await api.updateContender(contender.id, { isActive: !contender.isActive })
      await loadContenders()
    } catch (error) {
      console.error('Failed to toggle contender status:', error)
    }
  }

  const handleViewStats = async (id: string) => {
    try {
      const stats = await api.getContenderStats(id)
      setStatsModal(stats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const addVideoField = () => {
    setFormData(prev => ({
      ...prev,
      videos: [...prev.videos, { title: '', publicId: '' }],
    }))
  }

  const removeVideoField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }))
  }

  const updateVideo = (index: number, field: 'title' | 'publicId', value: string) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      ),
    }))
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="contenders-manager">
      {/* Header */}
      <div className="admin-section-header">
        <h2 className="admin-section-title">מתמודדים</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + הוסף מתמודד
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-section">
          <h3>{editingId ? 'עריכת מתמודד' : 'מתמודד חדש'}</h3>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div>
              <label>כינוי *</label>
              <input
                type="text"
                className="input"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="למשל: הנמר המסתורי"
              />
            </div>

            <div>
              <label>מזהה תמונה (Cloudinary Public ID) *</label>
              <input
                type="text"
                className="input"
                value={formData.imagePublicId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, imagePublicId: e.target.value }))
                  setImagePreviewError(false)
                }}
                placeholder="למשל: mize/contenders/tiger"
              />
              {formData.imagePublicId.trim() && cloudName && (
                <div className="preview-section">
                  <button
                    type="button"
                    className="btn btn-preview"
                    onClick={() => {
                      setShowImagePreview(!showImagePreview)
                      setImagePreviewError(false)
                    }}
                  >
                    {showImagePreview ? '🔼 הסתר תצוגה מקדימה' : '🔽 הצג תצוגה מקדימה'}
                  </button>
                  {showImagePreview && (
                    <div className="preview-container">
                      {imagePreviewError ? (
                        <div className="preview-error">
                          ❌ לא ניתן לטעון את התמונה - בדוק את המזהה
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(cloudName, formData.imagePublicId.trim(), {
                            width: 200,
                            height: 200,
                            crop: 'fill',
                            quality: 'auto',
                          })}
                          alt="תצוגה מקדימה"
                          className="preview-image"
                          onError={() => setImagePreviewError(true)}
                          onLoad={() => setImagePreviewError(false)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label>
                סרטונים ({formData.videos.length}/3)
                {formData.videos.length < 3 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginRight: '1rem' }}
                    onClick={addVideoField}
                  >
                    + הוסף סרטון
                  </button>
                )}
              </label>
              {formData.videos.map((video, index) => (
                <div key={index} className="video-field-container">
                  <div className="video-field">
                    <input
                      type="text"
                      className="input"
                      value={video.title}
                      onChange={(e) => updateVideo(index, 'title', e.target.value)}
                      placeholder="שם הסרטון"
                    />
                    <input
                      type="text"
                      className="input"
                      value={video.publicId}
                      onChange={(e) => {
                        updateVideo(index, 'publicId', e.target.value)
                        setVideoPreviewErrors(prev => ({ ...prev, [index]: false }))
                      }}
                      placeholder="מזהה Cloudinary"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => removeVideoField(index)}
                    >
                      ✕
                    </button>
                  </div>
                  {video.publicId.trim() && cloudName && (
                    <div className="preview-section">
                      <button
                        type="button"
                        className="btn btn-preview"
                        onClick={() => {
                          setShowVideoPreview(prev => ({ ...prev, [index]: !prev[index] }))
                          setVideoPreviewErrors(prev => ({ ...prev, [index]: false }))
                        }}
                      >
                        {showVideoPreview[index] ? '🔼 הסתר סרטון' : '🔽 הצג סרטון'}
                      </button>
                      {showVideoPreview[index] && (
                        <div className="preview-container video-preview">
                          {videoPreviewErrors[index] ? (
                            <div className="preview-error">
                              ❌ לא ניתן לטעון את הסרטון - בדוק את המזהה
                              <br />
                              <a 
                                href={getVideoUrl(cloudName, video.publicId.trim())} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="preview-link"
                              >
                                פתח קישור לבדיקה ↗
                              </a>
                            </div>
                          ) : (
                            <video
                              src={getVideoUrl(cloudName, video.publicId.trim())}
                              className="preview-video"
                              controls
                              onError={() => setVideoPreviewErrors(prev => ({ ...prev, [index]: true }))}
                              onLoadedData={() => setVideoPreviewErrors(prev => ({ ...prev, [index]: false }))}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                מתמודד פעיל
              </label>
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                ביטול
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="admin-section">
        {contenders.length === 0 ? (
          <div className="admin-empty">אין מתמודדים</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>כינוי</th>
                <th>סטטוס</th>
                <th>לבבות</th>
                <th>ניחושים</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {contenders.map(contender => (
                <tr key={contender.id}>
                  <td>{contender.nickname}</td>
                  <td>
                    <span className={`status-badge ${contender.isActive ? 'active' : 'inactive'}`}>
                      {contender.isActive ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td>{contender.loveCount}</td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => handleViewStats(contender.id)}
                    >
                      {contender.guessCount} ניחושים
                    </button>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-secondary" onClick={() => handleEdit(contender)}>
                        ערוך
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleToggleActive(contender)}
                      >
                        {contender.isActive ? 'השבת' : 'הפעל'}
                      </button>
                      <button
                        className="btn btn-secondary danger"
                        onClick={() => handleDelete(contender.id)}
                      >
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats Modal */}
      {statsModal && (
        <div className="modal-overlay" onClick={() => setStatsModal(null)}>
          <div className="modal-content stats-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>סטטיסטיקות: {statsModal.nickname}</h3>
              <button className="modal-close" onClick={() => setStatsModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="stats-summary">❤️ {statsModal.loveCount} לבבות</p>
              
              <h4>ניחושים ({statsModal.guesses.length})</h4>
              {statsModal.guesses.length === 0 ? (
                <p className="admin-empty">אין ניחושים</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>משתמש</th>
                      <th>ניחוש</th>
                      <th>תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsModal.guesses.map(guess => (
                      <tr key={guess.id}>
                        <td>{guess.displayName}</td>
                        <td>{guess.guessText}</td>
                        <td>{new Date(guess.createdAt).toLocaleString('he-IL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

