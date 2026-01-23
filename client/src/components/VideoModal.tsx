import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getVideoUrl } from '../utils/cloudinary'
import type { Video } from '../types'
import './VideoModal.css'

interface VideoModalProps {
  video: Video
  onClose: () => void
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const cloudName = useStore(state => state.cloudName)
  
  const videoUrl = cloudName ? getVideoUrl(cloudName, video.publicId) : ''

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on overlay, not children
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content video-modal">
        <button 
          className="modal-close-btn" 
          onClick={handleCloseClick}
          aria-label="סגור"
        >
          ✕
        </button>
        <div className="modal-header">
          <h3>{video.title}</h3>
        </div>
        <div className="video-container">
          {videoUrl ? (
            <video
              className="video-player"
              src={videoUrl}
              controls
              playsInline
              autoPlay
            />
          ) : (
            <div className="video-error">לא ניתן לטעון את הסרטון</div>
          )}
        </div>
      </div>
    </div>
  )
}

