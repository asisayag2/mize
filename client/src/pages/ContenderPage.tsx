import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { api } from '../api/client'
import { getImageUrl } from '../utils/cloudinary'
import VideoModal from '../components/VideoModal'
import GuessModal from '../components/GuessModal'
import WordCloud from '../components/WordCloud'
import type { ContenderDetail, Video } from '../types'
import './ContenderPage.css'

export default function ContenderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const cloudName = useStore(state => state.cloudName)
  const showLikeButton = useStore(state => state.showLikeButton)
  const fetchConfig = useStore(state => state.fetchConfig)
  const loveContender = useStore(state => state.loveContender)
  
  const [contender, setContender] = useState<ContenderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoving, setIsLoving] = useState(false)
  
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; video: Video | null }>({
    isOpen: false,
    video: null,
  })
  const [showGuessModal, setShowGuessModal] = useState(false)

  const fetchContender = useCallback(async () => {
    if (!id) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const data = await api.getContenderDetail(id)
      setContender({
        id: data.id,
        nickname: data.nickname,
        status: data.status,
        imagePublicId: data.imagePublicId,
        videos: data.videos,
        loveCount: data.loveCount,
        hasLoved: data.isLovedByUser,
        createdAt: data.createdAt || new Date().toISOString(),
        guessWords: data.guessWords,
      })
    } catch (err) {
      console.error('Error fetching contender:', err)
      setError('לא ניתן לטעון את המתמודד')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchConfig()
    fetchContender()
  }, [fetchConfig, fetchContender])

  const handleBack = () => {
    navigate('/app')
  }

  const handleOpenVideo = (video: Video) => {
    setVideoModal({ isOpen: true, video })
  }

  const handleCloseVideo = () => {
    setVideoModal({ isOpen: false, video: null })
  }

  const handleOpenGuess = () => {
    setShowGuessModal(true)
  }

  const handleCloseGuess = () => {
    setShowGuessModal(false)
    fetchContender()
  }

  const handleLove = async () => {
    if (!contender || isLoving) return
    
    setIsLoving(true)
    const newLovedState = await loveContender(contender.id)
    // Optimistically update local state
    setContender({
      ...contender,
      hasLoved: newLovedState,
      loveCount: contender.loveCount + (newLovedState ? 1 : -1),
    })
    setIsLoving(false)
  }

  const imageUrl = cloudName && contender?.imagePublicId
    ? getImageUrl(cloudName, contender.imagePublicId, {
        width: 800,
        height: 1000,
        crop: 'fit',
        quality: 'auto',
        format: 'auto',
      })
    : ''

  if (isLoading) {
    return (
      <div className="contender-page">
        <button className="back-button" onClick={handleBack}>
          → חזרה
        </button>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error || !contender) {
    return (
      <div className="contender-page">
        <button className="back-button" onClick={handleBack}>
          → חזרה
        </button>
        <div className="error-container">
          <p>{error || 'מתמודד לא נמצא'}</p>
          <button className="btn btn-primary" onClick={handleBack}>
            חזור לדף הראשי
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="contender-page">
      {/* Back button */}
      <button className="back-button" onClick={handleBack}>
        → חזרה
      </button>

      {/* Contender name - top */}
      <div className="name-header">
        <h1 className="contender-name">{contender.nickname}</h1>
        {contender.status === 'inactive' && (
          <span className="inactive-tag">הודח</span>
        )}
      </div>

      {/* Main content: Image with overlays */}
      <div className="main-layout">
        {/* Image with overlays */}
        <div className="image-container">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={contender.nickname}
              className="contender-image"
            />
          ) : (
            <div className="image-placeholder">
              <span>🎭</span>
            </div>
          )}
          
          {/* Love button overlay - bottom left (only if enabled) */}
          {showLikeButton && (
            <button
              className={`love-button ${contender.hasLoved ? 'loved' : ''}`}
              onClick={handleLove}
              disabled={isLoving}
            >
              <span className="love-icon">{contender.hasLoved ? '❤️' : '🤍'}</span>
              <span className="love-count">{contender.loveCount}</span>
            </button>
          )}

          {/* Videos overlay - bottom, left to right (desktop only) */}
          {contender.videos.length > 0 && (
            <div className="videos-overlay">
              {contender.videos.slice(0, 3).map((video, index) => (
                <button
                  key={index}
                  className="video-rect"
                  onClick={() => handleOpenVideo(video)}
                >
                  <span className="video-rect-icon">▶️</span>
                  <span className="video-rect-title">{video.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Videos section - mobile only */}
        {contender.videos.length > 0 && (
          <div className="videos-mobile">
            {contender.videos.slice(0, 3).map((video, index) => (
              <button
                key={index}
                className="video-rect"
                onClick={() => handleOpenVideo(video)}
              >
                <span className="video-rect-icon">▶️</span>
                <span className="video-rect-title">{video.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word Cloud section */}
      <div className="wordcloud-section">
        <h2 className="wordcloud-title">מה ניחשו אחרים</h2>
        <WordCloud words={contender.guessWords} />
        
        {/* Guess button */}
        {contender.status === 'active' && (
          <button className="guess-btn" onClick={handleOpenGuess}>
            🤔 אז מה הניחוש שלך?
          </button>
        )}
      </div>

      {/* Modals */}
      {videoModal.isOpen && videoModal.video && (
        <VideoModal video={videoModal.video} onClose={handleCloseVideo} />
      )}

      {showGuessModal && id && (
        <GuessModal contenderId={id} onClose={handleCloseGuess} />
      )}
    </div>
  )
}
