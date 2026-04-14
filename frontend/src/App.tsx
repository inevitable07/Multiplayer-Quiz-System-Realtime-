import { FC } from 'react'
import AppRoutes from './routes/AppRoutes'
import './App.css'

/**
 * App Component
 * Root component that renders the routing system
 * All page rendering is handled by AppRoutes component
 */
const App: FC = () => {
  return <AppRoutes />
}

export default App
