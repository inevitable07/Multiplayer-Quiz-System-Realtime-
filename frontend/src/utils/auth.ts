/**
 * Authentication Utilities
 * Helper functions for managing authentication state
 */

const TOKEN_KEY = 'token'

/**
 * Check if user is authenticated
 * @returns true if JWT token exists in localStorage
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY)
  return !!token
}

/**
 * Get JWT token from localStorage
 * @returns JWT token or null if not found
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set JWT token in localStorage
 * @param token JWT token to store
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Clear JWT token from localStorage
 * Used for logout functionality
 */
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Logout user
 * Clears token from storage and returns to auth page
 * Note: Page redirect should be handled by the calling component
 */
export const logout = (): void => {
  clearToken()
  // Token removal will trigger a 401 in API interceptor if making requests
}

/**
 * Decode JWT token and extract user information
 * JWT format: header.payload.signature
 * @param token JWT token to decode
 * @returns Decoded payload object or null if invalid
 */
export const decodeToken = (token: string): any | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('Invalid token format')
      return null
    }

    // Decode the payload (second part)
    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

/**
 * Get current user ID from JWT token
 * @returns User ID from token or null if not found
 */
export const getUserId = (): string | null => {
  const token = getToken()
  if (!token) return null

  const decoded = decodeToken(token)
  return decoded?.id || decoded?.userId || null
}
