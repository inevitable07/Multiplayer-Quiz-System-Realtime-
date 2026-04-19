import { FC, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Check, Play } from 'lucide-react'
import { initializeSocket, onEvent, offEvent, emitEvent, closeSocket } from '../services/socket'
import { getUserId } from '../utils/auth'

/**
 * Room Page - Real-time Waiting Room
 * 
 * Features:
 * - Real-time player list updates via Socket.IO
 * - Host-only "Start Game" button
 * - Game start navigation
 * - Proper socket lifecycle management
 * - Clean glass card design
 */

interface Player {
  id: string
  name: string
}

const Room: FC = () => {
  const { id: roomId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // State management
  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [shortCode, setShortCode] = useState<string>('')

  useEffect(() => {
    if (!roomId) return

    // Initialize socket connection
    const socket = initializeSocket()
    console.log('📱 Socket initialized, connected:', socket.connected)

    // Handler for room_users event (initial player list + host status)
    const handleRoomUsers = (data: { players: Player[]; isHost: boolean; shortCode?: string }) => {
      console.log('🎮 room_users event received:', data)
      setPlayers(data.players || [])
      setIsHost(data.isHost || false)
      setShortCode(data.shortCode || '')
      setLoading(false)
    }

    // Handler for user_joined event
    const handleUserJoined = (data: { player: Player }) => {
      console.log('👤 user_joined event received:', data)
      setPlayers((prev) => {
        const exists = prev.some((p) => p.id === data.player.id)
        return exists ? prev : [...prev, data.player]
      })
    }

    // Handler for user_left event
    const handleUserLeft = (data: { playerId: string }) => {
      console.log('👤 user_left event received:', data)
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId))
    }

    // Handler for game_started event
    const handleGameStarted = () => {
      console.log('🎮 game_started event received')
      navigate(`/quiz/${roomId}`)
    }

    // Register listeners BEFORE emitting join_room
    onEvent('room_users', handleRoomUsers)
    onEvent('user_joined', handleUserJoined)
    onEvent('user_left', handleUserLeft)
    onEvent('game_started', handleGameStarted)

    // Emit join_room event with user ID for proper host detection
    const userId = getUserId()
    console.log('🚀 Emitting join_room event:', { roomId, userId })
    emitEvent('join_room', { roomId, userId })

    // Timeout: if no response after 5 seconds, show timeout message
    const timeoutId = setTimeout(() => {
      setLoading(false)
      console.warn('⏱️ Room loading timeout - backend may not be responding')
    }, 5000)

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId)
      // Remove specific listeners instead of closing entire socket
      socket.off('room_users')
      socket.off('user_joined')
      socket.off('user_left')
      socket.off('game_started')
    }
  }, [roomId, navigate])

  // Copy room ID to clipboard
  const handleCopyRoomId = async () => {
    if (!shortCode) return

    try {
      // Copy the 6-digit short code
      await navigator.clipboard.writeText(shortCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room ID:', err)
    }
  }

  // Start game (only host can do this)
  const handleStartGame = () => {
    if (!isHost || players.length < 2) return

    setIsStarting(true)
    emitEvent('start_game', { roomId })
  }

  if (loading) {
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
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white text-lg">Joining room...</p>
          </div>
        </div>
      </div>
    )
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* Room Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-12 border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                Quiz Room
              </h1>
              <p className="text-gray-300 text-base">
                {players.length === 0
                  ? 'Waiting for players to join...'
                  : `${players.length} player${players.length !== 1 ? 's' : ''} ready`}
              </p>
            </div>

            {/* Room ID Section */}
            <div className="mb-10">
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Room Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shortCode || '------'}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-lg bg-white/15 border border-white/25 text-white font-mono text-sm cursor-default text-center text-2xl font-bold tracking-widest"
                />
                <button
                  onClick={handleCopyRoomId}
                  className="px-4 py-3 rounded-lg bg-white/20 hover:bg-white/25 text-white transition-all duration-300 border border-white/25 flex items-center gap-2"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check size={18} />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-300 mt-2">Copied to clipboard!</p>
              )}
            </div>

            {/* Players Section */}
            <div className="mb-10">
              <label className="block text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">
                Players ({players.length})
              </label>

              <div className="space-y-2 min-h-[120px]">
                {/* Host Badge */}
                {isHost && (
                  <div className="px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-medium">You (Host)</span>
                    <span className="text-xs px-2 py-1 bg-blue-500/30 text-blue-200 rounded border border-blue-500/30 font-semibold">
                      Host
                    </span>
                  </div>
                )}

                {/* Other Players List */}
                {players.length > 0 ? (
                  players.map((player) => (
                    <div
                      key={player.id}
                      className="px-4 py-3 rounded-lg bg-white/8 border border-white/10 flex items-center justify-between"
                    >
                      <span className="text-white text-sm font-medium">{player.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-sm">
                      {isHost ? 'Waiting for players to join...' : 'Loading...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Section */}
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={isStarting || players.length < 1}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/95 hover:bg-white text-black font-semibold rounded-lg transition-all duration-300 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-base"
              >
                {isStarting ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Start Game
                  </>
                )}
              </button>
            )}

            {!isHost && (
              <div className="px-6 py-3.5 rounded-lg bg-white/10 border border-white/20 text-center">
                <p className="text-gray-300 text-sm">
                  Waiting for the host to start the game
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Room




