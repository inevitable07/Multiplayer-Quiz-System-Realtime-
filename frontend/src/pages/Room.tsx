import { FC, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Check, Play, Plus } from 'lucide-react'
import { initializeSocket, onEvent, emitEvent } from '../services/socket'
import { getUserId } from '../utils/auth'
import apiClient from '../services/api'

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
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // State management
  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [shortCode, setShortCode] = useState<string>('')
  const [objectId, setObjectId] = useState<string>('') // ✅ PHASE 1 FIX: Store the MongoDB ObjectId
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [isDestroyingRoom, setIsDestroyingRoom] = useState(false)

  // Bulk upload state
  const [questionCount, setQuestionCount] = useState(0)
  const [showUploadSection, setShowUploadSection] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!roomId) return

    // Initialize socket connection
    const socket = initializeSocket()
    console.log('📱 Socket initialized, connected:', socket.connected)

    // Handler for room_users event (initial player list + host status)
    const handleRoomUsers = (data: { players: Player[]; isHost: boolean; shortCode?: string; objectId?: string }) => {
      console.log('🎮 room_users event received:', data)
      setPlayers(data.players || [])
      setIsHost(data.isHost || false)
      setShortCode(data.shortCode || '')
      setObjectId(data.objectId || '') // ✅ PHASE 1 FIX: Store the MongoDB ObjectId
      // Persist host status so Results page can show Replay button
      if (data.isHost) sessionStorage.setItem('isHost', 'true')
      else sessionStorage.removeItem('isHost')
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
    const handleGameStarted = (data: { roomId?: string; message?: string }) => {
      console.log('🎮 game_started event received:', data)
      // Use the ObjectId roomId from the server payload — this is critical for players
      // who joined via short code, since their URL param differs from the game's key.
      const targetRoomId = data.roomId || roomId
      navigate(`/quiz/${targetRoomId}`)
    }

    // Handler for room_destroyed event
    const handleRoomDestroyed = () => {
      console.log('🚨 room_destroyed event received')
      alert('The host has destroyed the room. You will be redirected to the lobby.')
      navigate('/lobby')
    }

    // Register listeners BEFORE emitting join_room
    onEvent('room_users', handleRoomUsers)
    onEvent('user_joined', handleUserJoined)
    onEvent('user_left', handleUserLeft)
    onEvent('game_started', handleGameStarted)
    onEvent('room_destroyed', handleRoomDestroyed)

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
      socket.off('room_destroyed')
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
    // Host is not in players[] array, so need at least 1 player (other than host) to start
    if (!isHost || players.length < 1) return

    setIsStarting(true)
    // ✅ PHASE 1 FIX: Always emit start_game with the MongoDB ObjectId (not shortCode from URL)
    emitEvent('start_game', { roomId: objectId || roomId })
  }

  // Leave room handler
  const handleLeaveRoom = () => {
    if (!roomId) return

    setIsLeavingRoom(true)
    const userId = getUserId()
    
    // Emit leave_room event to server
    emitEvent('leave_room', { roomId, userId })
    
    // Redirect to lobby after a short delay
    setTimeout(() => {
      navigate('/lobby')
    }, 500)
  }

  // Destroy room handler (host only)
  const handleDestroyRoom = () => {
    if (!isHost || !roomId) return

    const confirmed = window.confirm(
      'Are you sure you want to destroy this room? All players will be removed and the game will end.'
    )

    if (!confirmed) return

    setIsDestroyingRoom(true)
    const userId = getUserId()

    // Emit destroy_room event to server
    emitEvent('destroy_room', { roomId, userId })

    // Will be redirected by room_destroyed event handler
  }

  // Bulk upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setUploadError('Only .csv files are supported')
      setUploadFile(null)
      return
    }

    setUploadError(null)
    setUploadFile(file)
  }

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file')
      return
    }

    setUploadError(null)
    setUploadSuccess(false)

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await apiClient.post(
        `/room/${roomId}/upload-questions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      if (response.data.success) {
        setUploadSuccess(true)
        setUploadFile(null)
        setQuestionCount(response.data.data.totalQuestions)
        setShowUploadSection(false)

        // Reset file input
        const fileInput = document.getElementById(
          'csv-upload-input'
        ) as HTMLInputElement
        if (fileInput) fileInput.value = ''

        // Auto-clear success message
        setTimeout(() => setUploadSuccess(false), 3000)
      }
    } catch (error: any) {
      setUploadError(
        error.response?.data?.message || 'Failed to upload questions'
      )
    } finally {
      setIsUploading(false)
    }
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
                  className="flex-1 px-4 py-3 rounded-lg bg-white/15 border border-white/25 text-white font-mono text-2xl font-bold text-center cursor-default tracking-widest"
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

              <div className="space-y-2 min-h-30">
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

            {/* Bulk Upload Section (Host Only) */}
            {isHost && (
              <div className="mb-10 pb-10 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Questions ({questionCount})
                  </label>
                  {!showUploadSection && (
                    <button
                      onClick={() => setShowUploadSection(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded transition-all"
                    >
                      <Plus size={14} />
                      Upload
                    </button>
                  )}
                </div>

                {/* Upload Form */}
                {showUploadSection && (
                  <div className="bg-white/5 border border-white/15 rounded-lg p-4 space-y-4">
                    {/* File Input */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2">
                        Select CSV File
                      </label>
                      <input
                        id="csv-upload-input"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded text-white file:text-white file:bg-white/20 file:border-0 file:rounded file:cursor-pointer hover:border-white/40 transition-all"
                      />
                      {uploadFile && (
                        <p className="text-xs text-green-300 mt-2">
                          ✓ {uploadFile.name}
                        </p>
                      )}
                    </div>

                    {/* Format Guide */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2">
                        Required Format (CSV)
                      </label>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-3 overflow-x-auto">
                        <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
                          {`question,option1,option2,option3,option4,answer
"What is 2+2?","2","3","4","5","C"
"Capital of India?","Mumbai","Delhi","Kolkata","Chennai","B"
"Python is...","Language","Framework","Database","Tool","A"`}
                        </pre>
                      </div>
                      <div className="text-xs text-gray-400 mt-3 space-y-1">
                        <p>• Each row = one question</p>
                        <p>• Columns: question, option1, option2, option3, option4, answer</p>
                        <p>• Answer must be: A, B, C, or D</p>
                        <p>• Quote fields containing commas: "text with, comma"</p>
                        <p>• First row is treated as header if it contains "question" or "option"</p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {uploadError && (
                      <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                        {uploadError}
                      </div>
                    )}

                    {/* Success Message */}
                    {uploadSuccess && (
                      <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                        Questions uploaded successfully!
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleFileUpload}
                        disabled={isUploading || !uploadFile}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-500/30 hover:bg-blue-500/40 border border-blue-500/50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Questions'}
                      </button>
                      <button
                        onClick={() => {
                          setShowUploadSection(false)
                          setUploadFile(null)
                          const fileInput = document.getElementById(
                            'csv-upload-input'
                          ) as HTMLInputElement
                          if (fileInput) fileInput.value = ''
                        }}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Section */}
            {isHost && (
              <div className="space-y-3">
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

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleLeaveRoom}
                    disabled={isLeavingRoom}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLeavingRoom ? 'Leaving...' : 'Leave Room'}
                  </button>

                  <button
                    onClick={handleDestroyRoom}
                    disabled={isDestroyingRoom}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium rounded-lg transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isDestroyingRoom ? 'Destroying...' : 'Destroy Room'}
                  </button>
                </div>
              </div>
            )}

            {!isHost && (
              <div className="space-y-3">
                <div className="px-6 py-3.5 rounded-lg bg-white/10 border border-white/20 text-center">
                  <p className="text-gray-300 text-sm">
                    Waiting for the host to start the game
                  </p>
                </div>

                <button
                  onClick={handleLeaveRoom}
                  disabled={isLeavingRoom}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLeavingRoom ? 'Leaving...' : 'Leave Room'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Room




