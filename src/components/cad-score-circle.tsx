'use client'

interface CADScoreCircleProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function CADScoreCircle({ score, size = 'md', showLabel = true }: CADScoreCircleProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  // Calculate stroke-dashoffset for the progress circle
  const radius = size === 'sm' ? 28 : size === 'md' ? 40 : 56
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getStrokeColor = (score: number) => {
    if (score >= 80) return 'stroke-green-600'
    if (score >= 60) return 'stroke-yellow-600'
    if (score >= 40) return 'stroke-orange-600'
    return 'stroke-red-600'
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${getStrokeColor(score)}`}
            style={{
              transformOrigin: '50% 50%',
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${textSizeClasses[size]} ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">CAD Score</p>
          <p className="text-xs text-gray-500">
            {score >= 80 ? 'Excellent' : 
             score >= 60 ? 'Good' : 
             score >= 40 ? 'Fair' : 'Needs Work'}
          </p>
        </div>
      )}
    </div>
  )
}