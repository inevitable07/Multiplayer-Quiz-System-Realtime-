import { FC, useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { initializeSocket, onEvent, emitEvent } from '../services/socket'
import { getUserId } from '../utils/auth'

/**
 * Question Interface
 * Matches the backend send_question event structure
 */
interface Question {
  questionIndex: number
  totalQuestions: number
  question: string
  options: {
    label: string // A, B, C, D
    text: string // Option text
  }[]
  timeLimit: number // seconds
}

interface AnswerFeedback {
  correct: boolean
  correctAnswer: string
  currentScore: number
}

/**
 * Quiz Page - Real-Time Gameplay Screen
 *
 * Features:
 * - Real-time questions from server via Socket.IO
 * - Submit answers to backend for validation
 * - Receive instant feedback (correct/incorrect) with visual indicators
 * - Countdown timer that stops after answering
 * - Auto-advance to next question
 * - Navigate to results when game ends
 */
const Quiz: FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // State management
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [timer, setTimer] = useState<number>(10)
  const [isAnswered, setIsAnswered] = useState(false)
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null)
  const [currentScore, setCurrentScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref to track if answer has been submitted for current question (prevents double submit)
  const submittedRef = useRef(false)

  /**
   * Submit Answer to Server
   * Wrapped in useCallback so it's stable for the timer effect
   */
  const handleSubmitAnswer = useCallback(
    (optionLabel: string | null) => {
      if (submittedRef.current || !currentQuestion || !roomId) return

      const userId = getUserId()
      if (!userId) {
        setError('User ID not found')
        return
      }

      console.log(
        `📤 Submitting answer: ${optionLabel || 'TIMEOUT'} for Q${currentQuestion.questionIndex + 1}`
      )

      submittedRef.current = true
      setIsAnswered(true)
      if (optionLabel) setSelectedOption(optionLabel)

      // Emit answer to server
      emitEvent('submit_answer', {
        roomId,
        userId,
        selectedAnswer: optionLabel || 'SKIPPED',
      })
    },
    [currentQuestion, roomId]
  )

  // Socket initialization
  useEffect(() => {
    if (!roomId) return

    initializeSocket()

    console.log('🎮 Quiz component mounted, waiting for questions...')

    /**
     * Handle send_question event from server
     * Resets all state for the new question
     */
    const handleSendQuestion = (data: Question) => {
      console.log('📤 Received question:', data)
      setCurrentQuestion(data)
      setSelectedOption(null)
      setFeedback(null)
      setIsAnswered(false)
      submittedRef.current = false
      setTimer(data.timeLimit)
      setLoading(false)
      setError(null)
    }

    /**
     * ✅ PHASE 2: Handle answer_ack event from server
     * Shows correct/incorrect feedback with visual indicators
     */
    const handleAnswerAck = (data: AnswerFeedback) => {
      console.log('📬 Answer acknowledgment:', data)
      setFeedback(data)
      setCurrentScore(data.currentScore)
    }

    /**
     * Handle game_over event from server
     * Quiz is complete, navigate to results
     */
    const handleGameOver = (data: { leaderboard: any[]; totalQuestions: number }) => {
      console.log('🏁 Game over! Leaderboard:', data)
      navigate(`/results/${roomId}`, {
        state: { leaderboard: data.leaderboard, totalQuestions: data.totalQuestions },
      })
    }

    /**
     * Handle errors from server
     */
    const handleError = (data: { message: string }) => {
      console.error('❌ Server error:', data.message)
      setError(data.message)
      setLoading(false)
    }

    /**
     * Handle room_destroyed event
     */
    const handleRoomDestroyed = () => {
      console.log('🚨 Room destroyed! Redirecting to lobby...')
      setError('The room has been destroyed by the host.')
      setTimeout(() => {
        navigate('/lobby')
      }, 2000)
    }

    // Register listeners
    onEvent('send_question', handleSendQuestion)
    onEvent('answer_ack', handleAnswerAck) // ✅ PHASE 2: Changed from 'answer_feedback'
    onEvent('game_over', handleGameOver)
    onEvent('error', handleError)
    onEvent('room_destroyed', handleRoomDestroyed)

    // Cleanup
    return () => {
      const socket = initializeSocket()
      socket.off('send_question')
      socket.off('answer_feedback')
      socket.off('game_over')
      socket.off('error')
      socket.off('room_destroyed')
    }
  }, [roomId, navigate])

  /**
   * Timer Effect
   * Counts down every second. Stops when answered.
   * Auto-submits when timer reaches 0.
   */
  useEffect(() => {
    if (!currentQuestion || isAnswered) return

    if (timer <= 0) {
      // Time is up — auto-submit empty answer
      console.log('⏱️ Time up! Auto-submitting...')
      handleSubmitAnswer(null)
      return
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timer, isAnswered, currentQuestion, handleSubmitAnswer])

  /**
   * Handle Option Selection — Select or submit directly
   */
  const handleSelectOption = (optionLabel: string) => {
    if (isAnswered || !currentQuestion) return
    setSelectedOption(optionLabel)
  }

  /**
   * Get option visual state for feedback
   */
  const getOptionStyle = (optionLabel: string) => {
    const isSelected = selectedOption === optionLabel

    // No feedback yet — normal selection state
    if (!feedback) {
      if (isSelected) {
        return 'bg-white/20 border-white/60 ring-1 ring-white/30'
      }
      return 'bg-white/5 hover:bg-white/10 border-white/15 hover:border-white/30'
    }

    // Feedback received — show correct answer in green
    const isCorrectAnswer = optionLabel === feedback.correctAnswer

    if (isCorrectAnswer) {
      return 'bg-emerald-500/20 border-emerald-400/60 ring-1 ring-emerald-400/30'
    }

    // User selected wrong answer — highlight in red
    if (isSelected && !feedback.correct) {
      return 'bg-red-500/20 border-red-400/60 ring-1 ring-red-400/30'
    }

    // Other options — dimmed
    return 'bg-white/3 border-white/10 opacity-50'
  }

  /**
   * Format timer display
   */
  const timerDisplay = timer.toString().padStart(2, '0')
  const isLastQuestion =
    currentQuestion && currentQuestion.questionIndex === currentQuestion.totalQuestions - 1

  // Loading state
  if (loading && !currentQuestion) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center"
        style={{
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading quiz...</h2>
          <p className="text-gray-400 text-sm">Waiting for first question</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center"
        style={{
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="relative z-10 text-center max-w-md">
          <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-10 shadow-2xl">
            <h2 className="text-2xl font-bold text-red-400 mb-3">Error</h2>
            <p className="text-gray-300 mb-6 text-sm">{error}</p>
            <button
              onClick={() => navigate('/lobby')}
              className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/20 transition-all"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No question yet
  if (!currentQuestion) {
    return null
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ==================== OVERLAY ==================== */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* ==================== PROGRESS BAR ==================== */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-30">
        <div
          className="h-full bg-white/40 transition-all duration-500 ease-out"
          style={{
            width: `${((currentQuestion.questionIndex + 1) / currentQuestion.totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* ==================== TIMER (TOP-RIGHT) ==================== */}
      <div className="absolute top-6 right-6 z-20">
        <div
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl backdrop-blur-md border transition-all duration-300 ${
            isAnswered
              ? 'bg-white/5 border-white/10'
              : timer <= 3
                ? 'bg-red-500/15 border-red-500/30'
                : 'bg-white/10 border-white/20'
          }`}
        >
          <Clock className={`w-4 h-4 ${isAnswered ? 'text-gray-500' : timer <= 3 ? 'text-red-400' : 'text-white'}`} />
          <span
            className={`text-2xl font-bold font-mono transition-colors ${
              isAnswered ? 'text-gray-500' : timer <= 3 ? 'text-red-400' : 'text-white'
            }`}
          >
            {isAnswered ? '—' : timerDisplay}
          </span>
        </div>
      </div>

      {/* ==================== SCORE (TOP-LEFT) ==================== */}
      <div className="absolute top-6 left-6 z-20">
        <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
          <p className="text-xs text-gray-400 mb-0.5">Score</p>
          <p className="text-xl font-bold text-white">{currentScore}</p>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="relative z-10 w-full max-w-2xl px-6 py-8">
        {/* Question Counter */}
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-gray-400">
            Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
          </p>
        </div>

        {/* Glass Card Container */}
        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-8 md:p-10 shadow-2xl">
          {/* Question Text */}
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.label
              const isCorrectAnswer = feedback && option.label === feedback.correctAnswer
              const isWrongSelected = feedback && isSelected && !feedback.correct

              return (
                <button
                  key={option.label}
                  onClick={() => handleSelectOption(option.label)}
                  disabled={isAnswered}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-300
                    ${getOptionStyle(option.label)} text-white
                    disabled:cursor-default text-left
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        feedback && isCorrectAnswer
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : isWrongSelected
                            ? 'bg-red-500/30 text-red-300'
                            : isSelected && !feedback
                              ? 'bg-white/25 text-white'
                              : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {feedback && isCorrectAnswer ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isWrongSelected ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        option.label
                      )}
                    </div>
                    <div className="flex-grow pt-0.5">
                      <p className="font-medium text-sm">{option.text}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Submit Button or Feedback */}
          {!isAnswered ? (
            <button
              onClick={() => handleSubmitAnswer(selectedOption)}
              disabled={!selectedOption}
              className={`
                w-full py-3 rounded-xl font-medium text-sm transition-all duration-200
                ${
                  selectedOption
                    ? 'bg-white/90 hover:bg-white text-black active:scale-[0.98]'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/10'
                }
              `}
            >
              Submit Answer
            </button>
          ) : feedback ? (
            <div
              className={`text-center py-3 px-4 rounded-xl border transition-all duration-300 ${
                feedback.correct
                  ? 'bg-emerald-500/15 border-emerald-500/30'
                  : 'bg-red-500/15 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {feedback.correct ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <p className={`font-medium text-sm ${feedback.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                  {feedback.correct ? 'Correct!' : `Wrong — answer was ${feedback.correctAnswer}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 px-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-gray-400 text-sm">Submitting...</p>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          {isAnswered && feedback && (
            <p>{isLastQuestion ? 'Quiz complete! Preparing results...' : 'Next question loading...'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Quiz
