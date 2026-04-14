import io, { Socket } from 'socket.io-client'

/**
 * Socket Service
 * Manages WebSocket connection using Socket.IO
 * 
 * Server URL: http://localhost:5000
 * 
 * Note: Socket events are not implemented yet.
 * This service will be used in upcoming modules for:
 * - Joining rooms in real-time
 * - Sending/receiving messages
 * - Quiz event streaming (questions, answers, results)
 * - Player connection/disconnection notifications
 */

const SOCKET_SERVER_URL = process.env.VITE_SOCKET_URL || 'http://localhost:5000'

/**
 * Initialize Socket.IO connection
 * Returns null if already connected, otherwise returns the socket instance
 */
let socket: Socket | null = null

export const initializeSocket = (): Socket => {
  if (socket) {
    return socket
  }

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
    socket.disconnect()
    socket = null
  }
}

/**
 * Emit event to server
 * @param event - Event name
 * @param data - Data to send
 */
export const emitEvent = (event: string, data?: any): void => {
  if (!socket) {
    console.error('Socket not initialized')
    return
  }
  socket.emit(event, data)
}

/**
 * Listen to event from server
 * @param event - Event name
 * @param callback - Callback function
 */
export const onEvent = (event: string, callback: (data: any) => void): void => {
  if (!socket) {
    console.error('Socket not initialized')
    return
  }
  socket.on(event, callback)
}

/**
 * Stop listening to event
 * @param event - Event name
 * @param callback - Callback function to remove
 */
export const offEvent = (event: string, callback?: (data: any) => void): void => {
  if (!socket) {
    console.error('Socket not initialized')
    return
  }
  if (callback) {
    socket.off(event, callback)
  } else {
    socket.off(event)
  }
}

export default {
  initializeSocket,
  getSocket,
  closeSocket,
  emitEvent,
  onEvent,
  offEvent,
}
