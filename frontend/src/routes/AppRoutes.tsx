import { FC } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Import pages
import Auth from '../pages/Auth'
import Lobby from '../pages/Lobby'
import Room from '../pages/Room'
import Quiz from '../pages/Quiz'
import Results from '../pages/Results'

// Import route protection components
import ProtectedRoute from '../components/ProtectedRoute'
import PublicRoute from '../components/PublicRoute'
import { isAuthenticated } from '../utils/auth'

/**
 * App Routes with Authentication Protection
 * Defines all application routes with proper access control
 * 
 * Public Routes:
 * - /auth → PublicRoute (accessible only when NOT authenticated)
 * 
 * Protected Routes:
 * - /lobby → ProtectedRoute (accessible only when authenticated)
 * - /room/:id → ProtectedRoute (accessible only when authenticated)
 * 
 * Defaults:
 * - / → Redirects to /auth if not authenticated, or /lobby if authenticated
 * - /* → Redirects to /auth if not authenticated, or /lobby if authenticated
 */
const AppRoutes: FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Auth Page */}
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          }
        />

        {/* Protected Routes - Lobby */}
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Room with Dynamic ID */}
        <Route
          path="/room/:id"
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Quiz with Dynamic Room ID */}
        <Route
          path="/quiz/:roomId"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Results with Dynamic Room ID */}
        <Route
          path="/results/:roomId"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />

        {/* Default redirect - smart redirect based on auth state */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated() ? '/lobby' : '/auth'} replace />
          }
        />

        {/* Catch all unknown routes - smart redirect based on auth state */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated() ? '/lobby' : '/auth'} replace />
          }
        />
      </Routes>
    </Router>
  )
}

export default AppRoutes
