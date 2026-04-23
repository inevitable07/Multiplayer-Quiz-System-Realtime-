import { FC, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * 
 * If user is not authenticated (no token in localStorage):
 * - Redirects to /auth
 * 
 * Otherwise:
 * - Renders the protected page
 * 
 * Usage:
 * <ProtectedRoute>
 *   <Lobby />
 * </ProtectedRoute>
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  // Check if user has valid token
  if (!isAuthenticated()) {
    // No token found, redirect to auth
    return <Navigate to="/auth" replace />
  }

  // User is authenticated, render protected content
  return <>{children}</>
}

export default ProtectedRoute
