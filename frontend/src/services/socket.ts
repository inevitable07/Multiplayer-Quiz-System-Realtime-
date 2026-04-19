import io, { Socket } from 'socket.io-client'

/**
 * Socket Service - Manages WebSocket connection using Socket.IO
 * 
 * Features:
 * - Single socket instance per app
 * - Listener tracking for proper cleanup
 * - Debug logging for all events
 * - Connection status monitoring
 */

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket: Socket | null = null
const listeners: Map<string, Set<Function>> = new Map()

/**
 * Initialize Socket.IO connection
 * Returns existing socket if already connected, otherwise creates new one
 */
export const initializeSocket = (): Socket => {
  if (socket && socket.connected) {
    console.log('🔌 Socket already connected:', socket.id)
    return socket
  }

  console.log('🔌 Initializing new socket connection to:', SOCKET_SERVER_URL)
  socket = io(SOCKET_SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  })

  /**
   * Connection event - triggered when successfully connected to server
   */
  socket.on('connect', () => {
    console.log(`✅ Connected to server: ${socket?.id}`)
  })

  /**
   * Disconnection event - triggered when disconnected from server
   */
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server')
  })

  /**
   * Connection error event
   */
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error)
  })

  return socket
}

/**
 * Get the socket instance (must call initializeSocket first)
 */
export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.')
  }
  return socket
}

/**
 * Close socket connection
 */
export const closeSocket = (): void => {
  if (socket) {
    console.log('🔌 Closing socket connection')
    socket.disconnect()
    socket = null
    listeners.clear()
  }
}

/**
 * Emit event to server with logging
 * @param event - Event name
 * @param data - Data to send
 */
export const emitEvent = (event: string, data?: any): void => {
  if (!socket) {
    console.error('❌ Socket not initialized')
    return
  }
  console.log(`📤 Emitting event "${event}":`, data)
  socket.emit(event, data)
}

/**
 * Listen to event from server with automatic cleanup tracking
 * @param event - Event name
 * @param callback - Callback function
 */
export const onEvent = (event: string, callback: (data: any) => void): void => {
  if (!socket) {
    console.error('❌ Socket not initialized')
    return
  }
  
  // Create wrapper to log received events
  const wrappedCallback = (data: any) => {
    console.log(`📬 Received event "${event}":`, data)
    callback(data)
  }

  // Track listener for cleanup
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event)?.add(wrappedCallback)

  console.log(`📥 Listening for event "${event}"`)
  socket.on(event, wrappedCallback)
}

/**
 * Stop listening to specific event
 * @param event - Event name
 * @param callback - Original callback function (will find and remove wrapper)
 */
export const offEvent = (event: string, callback?: (data: any) => void): void => {
  if (!socket) {
    console.error('❌ Socket not initialized')
    return
  }

  // If no callback provided, remove all listeners for this event
  if (!callback) {
    socket.off(event)
    listeners.delete(event)
    console.log(`📴 Removed all listeners for event "${event}"`)
    return
  }

  // Remove all listeners for this event (since we can't track wrapped callbacks)
  socket.off(event)
  listeners.delete(event)
  console.log(`📴 Removed listener for event "${event}"`)
}

export default {
  initializeSocket,
  getSocket,
  closeSocket,
  emitEvent,
  onEvent,
  offEvent,
}
