import { useEffect, useRef, useCallback } from 'react'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const videoUrl = cloudName ? getVideoUrl(cloudName, video.publicId) : ''

  // Handle fullscreen exit - close modal when exiting fullscreen
  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      onClose()
    }
  }, [onClose])

  // Request fullscreen when video is ready
  const handleVideoLoaded = useCallback(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      // Try to enter fullscreen
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen().catch(() => {
          // Fullscreen not supported or denied - continue playing in modal
        })
      }
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [handleFullscreenChange])

  // Close on escape (when not in fullscreen)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose()
      }
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
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Exit fullscreen first if active
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => onClose())
    } else {
      onClose()
    }
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
              ref={videoRef}
              className="video-player"
              src={videoUrl}
              controls
              playsInline
              autoPlay
              onLoadedData={handleVideoLoaded}
            />
          ) : (
            <div className="video-error">לא ניתן לטעון את הסרטון</div>
          )}
        </div>
      </div>
    </div>
  )
}

