import { FC } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal } from 'lucide-react'
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
 * Results Page
 * Displays final leaderboard from game_over socket event payload.
 * Data is passed via React Router navigation state from Quiz.tsx.
 */
const Results: FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Read leaderboard from navigation state (set in Quiz.tsx on game_over)
  const state = location.state as { leaderboard: LeaderboardEntry[]; totalQuestions: number } | null
  const leaderboard: LeaderboardEntry[] = state?.leaderboard || []
  const totalQuestions: number = state?.totalQuestions || 0

  const currentUserId = getUserId()
  const myEntry = leaderboard.find((entry) => entry.userId === currentUserId)
  const myRank = myEntry ? leaderboard.findIndex((e) => e.userId === currentUserId) + 1 : null

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">{index + 1}</span>
  }

  const getRankBg = (index: number, isMe: boolean) => {
    if (isMe && index === 0) return 'bg-yellow-500/20 border-yellow-500/40'
    if (index === 0) return 'bg-yellow-500/10 border-yellow-500/30'
    if (index === 1) return 'bg-gray-400/10 border-gray-400/30'
    if (index === 2) return 'bg-amber-600/10 border-amber-600/30'
    if (isMe) return 'bg-blue-500/20 border-blue-500/40'
    return 'bg-white/5 border-white/10'
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Quiz Complete!
          </h1>
          <p className="text-gray-300 mb-8 text-sm">
            Room: {roomId} · {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
          </p>

          {/* My Score Highlight */}
          {myEntry && (
            <div className="mb-8">
              <div className="inline-block px-8 py-4 rounded-xl bg-white/10 border border-white/20">
                <p className="text-sm text-gray-400 mb-1">Your Score</p>
                <p className="text-4xl font-bold text-white">
                  {myEntry.score}
                  <span className="text-lg font-normal text-gray-400"> / {totalQuestions}</span>
                </p>
                {myRank && (
                  <p className="text-sm text-gray-300 mt-1">
                    Rank #{myRank} of {leaderboard.length}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <div className="mb-8 text-left">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const isMe = entry.userId === currentUserId
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${getRankBg(index, isMe)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getMedalIcon(index)}
                        <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-gray-200'}`}>
                          {entry.username || `Player ${index + 1}`}
                          {isMe && (
                            <span className="ml-2 text-xs text-blue-300 font-semibold">(You)</span>
                          )}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                        {entry.score}/{totalQuestions}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="inline-block px-6 py-3 rounded-lg bg-white/10 border border-white/20">
                <p className="text-sm text-gray-400 mb-2">Your Score</p>
                <p className="text-3xl font-bold text-white">No leaderboard data</p>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={() => navigate('/lobby')}
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
