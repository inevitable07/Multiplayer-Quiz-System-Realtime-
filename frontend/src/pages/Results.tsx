import { FC } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Crown, RotateCcw } from 'lucide-react'
import { getUserId } from '../utils/auth'

/**
 * Leaderboard Entry Interface
 * Matches backend game_over payload
 */
interface LeaderboardEntry {
  userId: string
  score: number
  username?: string
}

/**
 * Results Page — Minimal Full-Screen Design
 *
 * No glass cards, no heavy containers.
 * Content floats directly on the background with subtle overlay for readability.
 * Leaderboard is a clean, open list with typographic hierarchy.
 */
const Results: FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Read leaderboard + host status from navigation state (set in Quiz.tsx on game_over)
  const state = location.state as {
    leaderboard: LeaderboardEntry[]
    totalQuestions: number
  } | null

  const leaderboard: LeaderboardEntry[] = state?.leaderboard || []
  const totalQuestions: number = state?.totalQuestions || 0
  const isHost: boolean = sessionStorage.getItem('isHost') === 'true'

  const currentUserId = getUserId()
  const myEntry = leaderboard.find((entry) => entry.userId === currentUserId)
  const myRank = myEntry ? leaderboard.findIndex((e) => e.userId === currentUserId) + 1 : null
  const winner = leaderboard.length > 0 ? leaderboard[0] : null

  /**
   * Replay — host re-starts the game in the same room
   * Note: Questions are deleted after game ends, so host would need to re-upload.
   * This navigates back to the room screen where they can do that.
   */
  const handleReplay = () => {
    if (!roomId) return
    navigate(`/room/${roomId}`)
  }

  /**
   * Rank styling — subtle color coding for top 3
   */
  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-600'
    if (index === 1) return 'text-gray-500'
    if (index === 2) return 'text-amber-700'
    return 'text-gray-400'
  }

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st'
    if (index === 1) return '2nd'
    if (index === 2) return '3rd'
    return `${index + 1}th`
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
      {/* ==================== SUBTLE OVERLAY ==================== */}
      <div className="absolute inset-0 bg-white/30 pointer-events-none" />

      {/* ==================== CONTENT ==================== */}
      <div className="relative z-10 w-full max-w-lg px-6 py-12 text-center">

        {/* ——— Title ——— */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-1">
          Quiz Results
        </h1>
        <p className="text-gray-500 text-sm mb-10">
          {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} · {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
        </p>

        {/* ——— Winner Highlight ——— */}
        {winner && (
          <div className="mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-yellow-600">
                Winner
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">
              {winner.username || 'Player 1'}
            </p>
            <p className="text-lg text-gray-500 font-medium mt-1">
              {winner.score}
              <span className="text-sm font-normal"> / {totalQuestions}</span>
            </p>
          </div>
        )}

        {/* ——— My Score (if not winner) ——— */}
        {myEntry && myRank && myRank > 1 && (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Your Score
            </p>
            <p className="text-3xl font-bold text-gray-800">
              {myEntry.score}
              <span className="text-base font-normal text-gray-400"> / {totalQuestions}</span>
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Rank #{myRank}
            </p>
          </div>
        )}

        {/* ——— Divider ——— */}
        <div className="w-12 h-px bg-gray-300 mx-auto mb-8" />

        {/* ——— Leaderboard ——— */}
        {leaderboard.length > 0 ? (
          <div className="mb-10 text-left max-w-sm mx-auto">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">
              Leaderboard
            </h2>

            <div className="space-y-1">
              {leaderboard.map((entry, index) => {
                const isMe = entry.userId === currentUserId
                const isWinner = index === 0

                return (
                  <div
                    key={entry.userId}
                    className={`
                      flex items-center justify-between py-3 px-4 rounded-lg transition-all
                      ${isMe ? 'bg-gray-900/5' : ''}
                      ${isWinner ? 'py-4' : ''}
                    `}
                  >
                    {/* Left: rank + name */}
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-6 text-right ${getRankColor(index)}`}>
                        {getRankLabel(index)}
                      </span>
                      <span
                        className={`text-sm ${
                          isWinner ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                        }`}
                      >
                        {entry.username || `Player ${index + 1}`}
                        {isMe && (
                          <span className="ml-1.5 text-[11px] font-semibold text-blue-500">you</span>
                        )}
                      </span>
                    </div>

                    {/* Right: score */}
                    <span
                      className={`text-sm font-mono ${
                        isWinner ? 'font-bold text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {entry.score}/{totalQuestions}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mb-10">
            <p className="text-gray-400 text-sm">No leaderboard data available</p>
          </div>
        )}

        {/* ——— Actions ——— */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>

          {isHost && (
            <button
              onClick={handleReplay}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-gray-900 bg-gray-900/10 hover:bg-gray-900/15 border border-gray-900/20 transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Results
