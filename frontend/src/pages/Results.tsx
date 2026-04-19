import { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Results Page
 * Placeholder for quiz results screen
 * Will show final score and leaderboard in future
 */
const Results: FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ==================== OVERLAY ==================== */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="relative z-10 w-full max-w-2xl px-6 py-8 text-center">
        {/* Glass Card Container */}
        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-10 md:p-12 shadow-2xl">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Quiz Complete!
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-300 mb-10">
            Waiting for other players to finish...
          </p>

          {/* Score Placeholder */}
          <div className="mb-10">
            <div className="inline-block px-6 py-3 rounded-lg bg-white/10 border border-white/20">
              <p className="text-sm text-gray-400 mb-2">Your Score</p>
              <p className="text-3xl font-bold text-white">Calculating...</p>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={handleBackToLobby}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-all duration-300 border border-white/20 hover:border-white/30 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  )
}

export default Results
