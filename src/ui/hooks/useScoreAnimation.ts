import { useState, useEffect, useCallback } from 'react'
import { type ScoreBreakdown } from '@/engine/logic/ScoreCalculator'

export interface ScoreAnimationState {
  isAnimating: boolean
  currentValue: number
  targetValue: number
  progress: number
}

export interface UseScoreAnimationOptions {
  duration?: number
  easing?: (t: number) => number
  onComplete?: () => void
}

const defaultEasing = (t: number): number => {
  // Ease-out cubic
  return 1 - Math.pow(1 - t, 3)
}

export const useScoreAnimation = (
  targetScore: number,
  options: UseScoreAnimationOptions = {}
) => {
  const {
    duration = 1000,
    easing = defaultEasing,
    onComplete,
  } = options

  const [animationState, setAnimationState] = useState<ScoreAnimationState>({
    isAnimating: false,
    currentValue: 0,
    targetValue: targetScore,
    progress: 0,
  })

  const startAnimation = useCallback((fromValue: number = 0) => {
    setAnimationState({
      isAnimating: true,
      currentValue: fromValue,
      targetValue: targetScore,
      progress: 0,
    })
  }, [targetScore])

  useEffect(() => {
    if (!animationState.isAnimating) return

    const startTime = Date.now()
    const startValue = animationState.currentValue
    const valueChange = targetScore - startValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      
      const currentValue = startValue + (valueChange * easedProgress)
      
      setAnimationState(prev => ({
        ...prev,
        currentValue: Math.round(currentValue),
        progress,
      }))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setAnimationState(prev => ({
          ...prev,
          isAnimating: false,
          currentValue: targetScore,
          progress: 1,
        }))
        onComplete?.()
      }
    }

    requestAnimationFrame(animate)
  }, [animationState.isAnimating, targetScore, duration, easing, onComplete])

  return {
    ...animationState,
    startAnimation,
  }
}

export interface ScoreBreakdownAnimationState {
  baseScore: ScoreAnimationState
  multiplier: ScoreAnimationState
  positivePoints: ScoreAnimationState
  penalties: ScoreAnimationState
  bonuses: ScoreAnimationState
  totalScore: ScoreAnimationState
}

export const useScoreBreakdownAnimation = (
  scoreBreakdown: ScoreBreakdown,
  options: UseScoreAnimationOptions = {}
) => {
  const baseScoreAnimation = useScoreAnimation(scoreBreakdown.baseScore, {
    ...options,
    duration: (options.duration ?? 1000) * 0.2,
  })
  
  const multiplierAnimation = useScoreAnimation(scoreBreakdown.multiplier, {
    ...options,
    duration: (options.duration ?? 1000) * 0.2,
  })
  
  const positivePointsAnimation = useScoreAnimation(scoreBreakdown.positivePoints, {
    ...options,
    duration: (options.duration ?? 1000) * 0.3,
  })
  
  const penaltiesAnimation = useScoreAnimation(scoreBreakdown.penalties, {
    ...options,
    duration: (options.duration ?? 1000) * 0.2,
  })
  
  const bonusesAnimation = useScoreAnimation(scoreBreakdown.bonuses, {
    ...options,
    duration: (options.duration ?? 1000) * 0.2,
  })
  
  const totalScoreAnimation = useScoreAnimation(scoreBreakdown.totalScore, {
    ...options,
    duration: (options.duration ?? 1000) * 0.3,
  })

  const startSequentialAnimation = useCallback(() => {
    // Start animations in sequence for dramatic effect
    baseScoreAnimation.startAnimation()
    
    setTimeout(() => {
      multiplierAnimation.startAnimation()
    }, 200)
    
    setTimeout(() => {
      positivePointsAnimation.startAnimation()
    }, 400)
    
    setTimeout(() => {
      penaltiesAnimation.startAnimation()
    }, 600)
    
    setTimeout(() => {
      bonusesAnimation.startAnimation()
    }, 800)
    
    setTimeout(() => {
      totalScoreAnimation.startAnimation()
    }, 1000)
  }, [
    baseScoreAnimation,
    multiplierAnimation,
    positivePointsAnimation,
    penaltiesAnimation,
    bonusesAnimation,
    totalScoreAnimation,
  ])

  const startParallelAnimation = useCallback(() => {
    // Start all animations at once for quick reveal
    baseScoreAnimation.startAnimation()
    multiplierAnimation.startAnimation()
    positivePointsAnimation.startAnimation()
    penaltiesAnimation.startAnimation()
    bonusesAnimation.startAnimation()
    totalScoreAnimation.startAnimation()
  }, [
    baseScoreAnimation,
    multiplierAnimation,
    positivePointsAnimation,
    penaltiesAnimation,
    bonusesAnimation,
    totalScoreAnimation,
  ])

  return {
    animations: {
      baseScore: baseScoreAnimation,
      multiplier: multiplierAnimation,
      positivePoints: positivePointsAnimation,
      penalties: penaltiesAnimation,
      bonuses: bonusesAnimation,
      totalScore: totalScoreAnimation,
    },
    startSequentialAnimation,
    startParallelAnimation,
    isAnyAnimating: [
      baseScoreAnimation,
      multiplierAnimation,
      positivePointsAnimation,
      penaltiesAnimation,
      bonusesAnimation,
      totalScoreAnimation,
    ].some(anim => anim.isAnimating),
  }
}