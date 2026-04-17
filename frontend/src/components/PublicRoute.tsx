import { FC, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

interface PublicRouteProps {
  children: ReactNode
}

/**
 * PublicRoute Component
 * Wraps public routes like /auth
 * Prevents already-authenticated users from accessing them
 * 
 * If user is already authenticated (has token in localStorage):
 * - Redirects to /lobby
 * 
 * Otherwise:
 * - Renders the public page (auth page)
 * 
 * Usage:
 * <PublicRoute>
 *   <Auth />
 * </PublicRoute>
 */
const PublicRoute: FC<PublicRouteProps> = ({ children }) => {
  // If user is already authenticated, redirect to lobby
  if (isAuthenticated()) {
    return <Navigate to="/lobby" replace />
  }

  // User is not authenticated, show public content (auth page)
  return <>{children}</>
}

export default PublicRoute
