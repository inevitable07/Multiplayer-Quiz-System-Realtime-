import { FC } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Import pages
import Auth from '../pages/Auth'
import Lobby from '../pages/Lobby'
import Room from '../pages/Room'

/**
 * App Routes
 * Defines all application routes and their corresponding pages
 * 
 * Routes:
 * - /auth → Authentication page (signup/login)
 * - /lobby → Lobby page (room list and creation)
 * - /room/:id → Room page (quiz content)
 * - / → Redirect to /auth (default)
 */
const AppRoutes: FC = () => {
  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={<Auth />} />

        {/* Lobby route */}
        <Route path="/lobby" element={<Lobby />} />

        {/* Room route with dynamic ID parameter */}
        <Route path="/room/:id" element={<Room />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/auth" replace />} />

        {/* Catch all unknown routes */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  )
}

export default AppRoutes
