import { useState } from 'react'
import { useStore } from '../store/useStore'
import { getImageUrl } from '../utils/cloudinary'
import type { Contender, Video } from '../types'
import './ContenderCard.css'

interface ContenderCardProps {
  contender: Contender
  onOpenVideo: (video: Video) => void
  onOpenGuess: () => void
}

export default function ContenderCard({
  contender,
  onOpenVideo,
  onOpenGuess,
}: ContenderCardProps) {
  const cloudName = useStore(state => state.cloudName)
  const loveContender = useStore(state => state.loveContender)
  const [isLoving, setIsLoving] = useState(false)

  const handleLove = async () => {
    if (isLoving) return
    
    setIsLoving(true)
    await loveContender(contender.id)
    setIsLoving(false)
  }

  const imageUrl = getImageUrl(cloudName, contender.imagePublicId, {
    width: 400,
    height: 500,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  })

  return (
    <div className={`contender-card card ${contender.status === 'inactive' ? 'card-inactive' : ''}`}>
      {/* Image */}
      <div className="contender-image-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={contender.nickname}
            className="contender-image"
            loading="lazy"
          />
        ) : (
          <div className="contender-image-placeholder">
            <span>🎭</span>
          </div>
        )}
        {contender.status === 'inactive' && (
          <div className="contender-inactive-badge">הודח</div>
        )}
        {/* Love counter on image */}
        {contender.loveCount > 0 && (
          <div className="love-counter-badge">
            <span className="love-counter-text">{contender.loveCount} אנשים ❤️ אותי</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="contender-content">
        <h3 className="contender-nickname">{contender.nickname}</h3>

        {/* Videos */}
        {contender.videos.length > 0 && (
          <div className="contender-videos">
            {contender.videos.map((video, index) => (
              <button
                key={index}
                className="video-link"
                onClick={() => onOpenVideo(video)}
              >
                <span className="video-play-icon">▶️</span>
                <span className="video-title">{video.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="contender-actions">
          {/* Love button (toggle) */}
          <button
            className={`btn btn-love ${contender.hasLoved ? 'loved' : ''}`}
            onClick={handleLove}
            disabled={isLoving}
          >
            {contender.hasLoved ? '❤️' : '🤍'} {contender.hasLoved ? 'אהבתי!' : 'אהבתי'}
          </button>

          {/* Guess button - only for active contenders */}
          {contender.status === 'active' && (
            <button className="btn btn-secondary" onClick={onOpenGuess}>
              🤔 נחש מי זה?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

