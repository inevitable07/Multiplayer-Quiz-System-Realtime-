import { FC, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'

/**
 * Question Interface
 * Defines the structure of a quiz question
 */
interface Question {
  id: string
  text: string
  options: {
    label: string // A, B, C, D
    text: string // Option text
  }[]
  correctAnswer: string // Label of correct option (A, B, C, D)
}

/**
 * Mock Questions Data
 * In production, these would come from the backend
 */
const MOCK_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'What is the capital of France?',
    options: [
      { label: 'A', text: 'London' },
      { label: 'B', text: 'Paris' },
      { label: 'C', text: 'Berlin' },
      { label: 'D', text: 'Madrid' },
    ],
    correctAnswer: 'B',
  },
  {
    id: '2',
    text: 'Which planet is closest to the Sun?',
    options: [
      { label: 'A', text: 'Venus' },
      { label: 'B', text: 'Earth' },
      { label: 'C', text: 'Mercury' },
      { label: 'D', text: 'Mars' },
    ],
    correctAnswer: 'C',
  },
  {
    id: '3',
    text: 'What is the largest ocean on Earth?',
    options: [
      { label: 'A', text: 'Atlantic Ocean' },
      { label: 'B', text: 'Arctic Ocean' },
      { label: 'C', text: 'Indian Ocean' },
      { label: 'D', text: 'Pacific Ocean' },
    ],
    correctAnswer: 'D',
  },
  {
    id: '4',
    text: 'In what year did the Titanic sink?',
    options: [
      { label: 'A', text: '1912' },
      { label: 'B', text: '1905' },
      { label: 'C', text: '1920' },
      { label: 'D', text: '1898' },
    ],
    correctAnswer: 'A',
  },
  {
    id: '5',
    text: 'What is the chemical symbol for Gold?',
    options: [
      { label: 'A', text: 'Gd' },
      { label: 'B', text: 'Go' },
      { label: 'C', text: 'Au' },
      { label: 'D', text: 'Ag' },
    ],
    correctAnswer: 'C',
  },
]

const TIMER_DURATION = 10 // seconds per question

/**
 * Quiz Page - Gameplay Screen
 * 
 * Features:
 * - Display questions with 4 multiple choice options
 * - Countdown timer per question
 * - Select and highlight chosen option
 * - Clean, minimal UI with premium feel
 * - Local state management (no real-time sync)
 */
const Quiz: FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [timer, setTimer] = useState(TIMER_DURATION)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)

  // Get current question
  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === MOCK_QUESTIONS.length - 1

  /**
   * Timer Effect
   * Decrements timer every second
   * Automatically advances to next question when time runs out
   */
  useEffect(() => {
    if (isAnswered) return

    if (timer === 0) {
      // Time's up, move to next question
      handleNextQuestion()
      return
    }

    const timerInterval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [timer, isAnswered])

  /**
   * Handle Option Selection
   * Shows feedback briefly, then moves to next question
   */
  const handleSelectOption = (optionLabel: string) => {
    if (isAnswered) return

    setSelectedOption(optionLabel)
    setIsAnswered(true)
    setShowFeedback(true)

    // Wait 1.5 seconds to show feedback, then move to next
    setTimeout(() => {
      handleNextQuestion()
    }, 1500)
  }

  /**
   * Move to Next Question
   * Resets state for new question or ends quiz
   */
  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Quiz complete - navigate to results
      navigate(`/results/${roomId}`)
      return
    }

    // Reset state for next question
    setCurrentQuestionIndex((prev) => prev + 1)
    setSelectedOption(null)
    setTimer(TIMER_DURATION)
    setShowFeedback(false)
    setIsAnswered(false)
  }

  /**
   * Check if selected option is correct
   */
  const isCorrect = selectedOption === currentQuestion.correctAnswer

  /**
   * Format timer display
   * Shows seconds with leading zero if needed
   */
  const timerDisplay = timer.toString().padStart(2, '0')

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

      {/* ==================== TIMER (TOP-RIGHT) ==================== */}
      <div className="absolute top-8 right-8 z-20">
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md">
          <Clock className="w-5 h-5 text-white" />
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold font-mono transition-colors ${
              timer <= 3 ? 'text-red-400' : 'text-white'
            }`}>
              {timerDisplay}
            </span>
            <span className="text-sm text-gray-300">sec</span>
          </div>
        </div>
      </div>

      {/* ==================== PROGRESS BAR ==================== */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{
            width: `${((currentQuestionIndex + 1) / MOCK_QUESTIONS.length) * 100}%`,
          }}
        />
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="relative z-10 w-full max-w-2xl px-6 py-8">
        {/* Question Counter */}
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-gray-400 mb-2">
            Question {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}
          </p>
        </div>

        {/* Glass Card Container */}
        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-8 md:p-10 shadow-2xl">
          {/* Question Text */}
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.label
              const isCorrectOption = option.label === currentQuestion.correctAnswer

              // Determine styling based on state
              let bgColor = 'bg-white/5 hover:bg-white/10 border-white/20'
              let textColor = 'text-white'

              if (showFeedback) {
                if (isCorrectOption) {
                  // Always show correct answer in green
                  bgColor = 'bg-green-500/30 border-green-500/60'
                  textColor = 'text-white'
                } else if (isSelected && !isCorrect) {
                  // Show wrong answer user selected in red
                  bgColor = 'bg-red-500/30 border-red-500/60'
                  textColor = 'text-white'
                } else {
                  // Other unselected options fade out
                  bgColor = 'bg-white/5 border-white/10'
                  textColor = 'text-gray-400'
                }
              } else if (isSelected) {
                // Before answering, highlight selected option
                bgColor = 'bg-blue-500/30 border-blue-500/60'
              }

              return (
                <button
                  key={option.label}
                  onClick={() => handleSelectOption(option.label)}
                  disabled={isAnswered}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-200
                    ${bgColor} ${textColor}
                    disabled:cursor-not-allowed text-left
                    group
                  `}
                >
                  {/* Option Label */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                      {option.label}
                    </div>
                    <div className="flex-grow pt-0.5">
                      <p className="font-medium">{option.text}</p>
                    </div>
                  </div>

                  {/* Feedback Icon */}
                  {showFeedback && isCorrectOption && (
                    <div className="absolute top-4 right-4 text-green-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {showFeedback && isSelected && !isCorrect && (
                    <div className="absolute top-4 right-4 text-red-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Feedback Message */}
          {showFeedback && (
            <div
              className={`text-center py-3 px-4 rounded-lg font-medium transition-all ${
                isCorrect
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
          )}
        </div>

        {/* Question Navigation Info */}
        <div className="mt-8 text-center text-sm text-gray-400">
          {isAnswered && !isLastQuestion && (
            <p>Next question in {TIMER_DURATION}s...</p>
          )}
          {isAnswered && isLastQuestion && <p>Quiz complete! Preparing results...</p>}
        </div>
      </div>
    </div>
  )
}

export default Quiz
