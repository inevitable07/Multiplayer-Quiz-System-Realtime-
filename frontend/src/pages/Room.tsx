import { FC } from 'react'
import { useParams } from 'react-router-dom'

/**
 * Room Page
 * Displays room details, players, and quiz content
 * Placeholder for Module 7 - Part 2
 */
const Room: FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1>Room Page</h1>
      <p>Room ID: {id}</p>
      <p>Quiz and player list will be implemented here</p>
    </div>
  )
}

export default Room
