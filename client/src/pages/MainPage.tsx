import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules'
import { useStore } from '../store/useStore'
import ContenderCard from '../components/ContenderCard'
import VideoModal from '../components/VideoModal'
import GuessModal from '../components/GuessModal'
import type { Video } from '../types'

import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import './MainPage.css'

export default function MainPage() {
  const navigate = useNavigate()
  const displayName = useStore(state => state.displayName)
  const clearDisplayName = useStore(state => state.clearDisplayName)
  const contenders = useStore(state => state.contenders)
  const isLoadingContenders = useStore(state => state.isLoadingContenders)
  const activeCycle = useStore(state => state.activeCycle)
  const voteStatus = useStore(state => state.voteStatus)
  const fetchConfig = useStore(state => state.fetchConfig)
  const fetchContenders = useStore(state => state.fetchContenders)
  const fetchVoteStatus = useStore(state => state.fetchVoteStatus)

  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; video: Video | null }>({
    isOpen: false,
    video: null,
  })
  const [guessModal, setGuessModal] = useState<{ isOpen: boolean; contenderId: string | null }>({
    isOpen: false,
    contenderId: null,
  })

  useEffect(() => {
    fetchConfig()
    fetchContenders()
    fetchVoteStatus()
  }, [fetchConfig, fetchContenders, fetchVoteStatus])

  const handleChangeName = () => {
    clearDisplayName()
    navigate('/')
  }

  const handleOpenVideo = (video: Video) => {
    setVideoModal({ isOpen: true, video })
  }

  const handleCloseVideo = () => {
    setVideoModal({ isOpen: false, video: null })
  }

  const handleOpenGuess = (contenderId: string) => {
    setGuessModal({ isOpen: true, contenderId })
  }

  const handleCloseGuess = () => {
    setGuessModal({ isOpen: false, contenderId: null })
  }

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="header-mask">🎭</span>
            <h1 className="header-title">מי-זה?</h1>
          </div>
          <div className="header-user">
            <span className="user-name">שלום, {displayName}</span>
            <button className="btn-link" onClick={handleChangeName}>
              החלף שם
            </button>
          </div>
        </div>
      </header>

      {/* Vote CTA */}
      <div className="vote-cta-container">
        <button
          className={`btn btn-primary btn-large vote-cta ${activeCycle ? 'active' : ''}`}
          disabled={!activeCycle}
          onClick={() => activeCycle && navigate('/vote')}
        >
          {!activeCycle 
            ? '🗳️ אין הצבעה פעילה' 
            : voteStatus?.hasVoted 
              ? '🔄 שנה את ההצבעה שלי'
              : '🗳️ הצבע עכשיו'
          }
        </button>
      </div>

      {/* Contenders Carousel */}
      <main className="main-content">
        {isLoadingContenders ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : contenders.length === 0 ? (
          <div className="empty-state">
            <p>אין מתמודדים להצגה</p>
          </div>
        ) : (
          <Swiper
            modules={[EffectCoverflow, Pagination, Navigation]}
            effect="coverflow"
            grabCursor
            centeredSlides
            slidesPerView="auto"
            coverflowEffect={{
              rotate: 5,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: false,
            }}
            pagination={{ clickable: true }}
            navigation
            className="contenders-carousel"
          >
            {contenders.map(contender => (
              <SwiperSlide key={contender.id} className="contender-slide">
                <ContenderCard
                  contender={contender}
                  onOpenVideo={handleOpenVideo}
                  onOpenGuess={() => handleOpenGuess(contender.id)}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </main>

      {/* Modals */}
      {videoModal.isOpen && videoModal.video && (
        <VideoModal video={videoModal.video} onClose={handleCloseVideo} />
      )}

      {guessModal.isOpen && guessModal.contenderId && (
        <GuessModal
          contenderId={guessModal.contenderId}
          onClose={handleCloseGuess}
        />
      )}
    </div>
  )
}

