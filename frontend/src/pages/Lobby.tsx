import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowRight, LogOut } from 'lucide-react'
import apiClient from '../services/api'
import { logout } from '../utils/auth'

/**
 * Lobby Page - Premium Spotlight Background + Glass Card
 * 
 * Design System:
 * - Background: Dark spotlight image from public/background.png
 * - Primary UI: Centered glass card with translucent white background
 * - Typography: Bold modern headings, refined gray text
 * - Interaction: Smooth transitions, minimal animations
 * - Philosophy: Premium product feel, zero template/AI-generated look
 */
const Lobby: FC = () => {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true)
    setError('')

    try {
      const response = await apiClient.post('/room/create')
      const createdRoomId = response.data.data?.roomId || response.data.roomId

      if (!createdRoomId) {
        setError('Failed to create room. Please try again.')
        setIsCreatingRoom(false)
        return
      }

      navigate(`/room/${createdRoomId}`)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to create room. Please try again.'
      setError(errorMessage)
      console.error('Create room error:', err)
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    setIsJoiningRoom(true)

    try {
      await apiClient.post(`/room/join/${roomId}`)
      navigate(`/room/${roomId}`)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to join room. Please check the room ID.'
      setError(errorMessage)
      console.error('Join room error:', err)
    } finally {
      setIsJoiningRoom(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ==================== OVERLAY FOR BETTER CARD VISIBILITY ==================== */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* ==================== LOGOUT BUTTON (TOP-RIGHT) ==================== */}
      <div className="absolute top-8 right-8 z-20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all duration-300 border border-white/20 hover:border-white/30 backdrop-blur-sm"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Premium Glass Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-12 border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                Welcome
              </h1>
              <p className="text-gray-300 text-base leading-relaxed">
                Create or join a room to start playing
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* ==================== CREATE BUTTON ==================== */}
            <button
              onClick={handleCreateRoom}
              disabled={isCreatingRoom || isJoiningRoom}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mb-5 bg-white/95 hover:bg-white text-black font-semibold rounded-lg transition-all duration-300 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              {isCreatingRoom ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Create Room
                </>
              )}
            </button>

            {/* ==================== DIVIDER ==================== */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
                or
              </span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* ==================== JOIN SECTION ==================== */}
            <form onSubmit={handleJoinRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  Room ID
                </label>
                <input
                  type="text"
                  placeholder="Paste room ID here"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value)
                    if (error) setError('')
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-white/15 border border-white/25 text-white placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/30 transition-all duration-300"
                  disabled={isJoiningRoom || isCreatingRoom}
                />
              </div>

              <button
                type="submit"
                disabled={isJoiningRoom || isCreatingRoom}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/20 hover:bg-white/25 text-white font-semibold rounded-lg transition-all duration-300 border border-white/25 hover:border-white/35 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-base"
              >
                {isJoiningRoom ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <ArrowRight size={20} />
                    Join Room
                  </>
                )}
              </button>
            </form>

            {/* ==================== FOOTER ==================== */}
            <div className="mt-10 pt-6 border-t border-white/15">
              <p className="text-xs text-gray-400 text-center tracking-wide">
                Share your room ID with friends to play
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Lobby
