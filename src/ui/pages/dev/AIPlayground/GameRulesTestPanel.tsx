import React, { useState } from 'react'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { RequestModelGenerateEvent } from '@ocentra/eventing-domain/events/model/RequestModelGenerateEvent';
import { RequestModelStopEvent } from '@ocentra/eventing-domain/events/model/RequestModelStopEvent';
import { ModelGenerationUpdateEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationUpdateEvent';
import { ModelGenerationCompleteEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationCompleteEvent';
import { ModelGenerationStoppedEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationStoppedEvent';
import { GameModeFactory } from '@ocentra/game-asset-domain/factories/GameModeFactory'
import { AIHelper } from '@ocentra/ai-domain/orchestration/AIHelper'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'

const log = MainAppLogger.instance
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)

interface GameRulesTestPanelProps {
  modelId: string | null
  quantPath?: string | null
  onMetricsUpdate: (metrics: { ttft?: number; tps?: string; numTokens?: number }) => void
}

const TEST_SCENARIOS = [
  {
    name: 'Explain Claim Rules',
    prompt: 'Explain the rules of the Claim card game in detail.',
  },
  {
    name: 'Evaluate Hand',
    prompt: 'I have these cards: Ace of Spades, King of Hearts, Queen of Diamonds. What would be a good strategy?',
  },
  {
    name: 'Game State Analysis',
    prompt: 'In a Claim game with 4 players, if I have declared Spades and another player picks up the floor card, what should I do?',
  },
  {
    name: 'Three Card Brag Rules',
    prompt: 'Explain the hand rankings in Three Card Brag.',
  },
]

export const GameRulesTestPanel: React.FC<GameRulesTestPanelProps> = ({
  modelId,
  onMetricsUpdate,
}) => {
  const [selectedGameMode, setSelectedGameMode] = useState<string>('claim')
  const [testResponse, setTestResponse] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStreaming, setCurrentStreaming] = useState('')

  React.useEffect(() => {
    // Subscribe to generation events
    const handleUpdate = (event: ModelGenerationUpdateEvent) => {
      setCurrentStreaming((prev) => prev + event.update.token)
      onMetricsUpdate({
        tps: event.update.tps,
        numTokens: event.update.numTokens,
      })
    }

    const handleComplete = (event: ModelGenerationCompleteEvent) => {
      setIsGenerating(false)
      setTestResponse(event.complete.text)
      setCurrentStreaming('')
      onMetricsUpdate({
        ttft: event.complete.ttft,
        tps: event.complete.tps,
        numTokens: event.complete.numTokens,
      })
    }

    const handleStopped = (event: ModelGenerationStoppedEvent) => {
      setIsGenerating(false)
      setTestResponse(event.stopped.text)
      setCurrentStreaming('')
      onMetricsUpdate({
        numTokens: event.stopped.numTokens,
      })
    }

    EventBus.instance.subscribe(ModelGenerationUpdateEvent, handleUpdate)
    EventBus.instance.subscribe(ModelGenerationCompleteEvent, handleComplete)
    EventBus.instance.subscribe(ModelGenerationStoppedEvent, handleStopped)

    return () => {
      EventBus.instance.unsubscribe(ModelGenerationUpdateEvent, handleUpdate)
      EventBus.instance.unsubscribe(ModelGenerationCompleteEvent, handleComplete)
      EventBus.instance.unsubscribe(ModelGenerationStoppedEvent, handleStopped)
    }
  }, [onMetricsUpdate])

  const handleTestScenario = async (scenario: typeof TEST_SCENARIOS[0]) => {
    if (!modelId || isGenerating) return

    setIsGenerating(true)
    setTestResponse('')
    setCurrentStreaming('')

    try {
      const event = new RequestModelGenerateEvent({
        systemMessage: 'You are an expert AI assistant that understands card game rules.',
        userPrompt: scenario.prompt,
      })
      EventBus.instance.publish(event)
      await event.deferred.promise
    } catch (error) {
      logError('Test error:', error)
      setIsGenerating(false)
      setCurrentStreaming('')
    }
  }

  const handleCustomTest = async () => {
    if (!modelId || isGenerating) return

    setIsGenerating(true)
    setTestResponse('')
    setCurrentStreaming('')

    try {
      // Load GameMode and use AIHelper to construct prompts
      const gameMode = await GameModeFactory.getGameMode(selectedGameMode)
      const aiHelper = AIHelper.getInstance()
      const systemMessage = aiHelper.GetSystemMessage(gameMode)
      const userPrompt = 'Explain the game rules and provide strategy tips.'

      const event = new RequestModelGenerateEvent({
        systemMessage,
        userPrompt,
      })
      EventBus.instance.publish(event)
      await event.deferred.promise
    } catch (error) {
      logError('Custom test error:', error)
      setIsGenerating(false)
      setCurrentStreaming('')
    }
  }

  const handleStop = () => {
    EventBus.instance.publish(new RequestModelStopEvent())
  }

  return (
    <div className="game-rules-test-panel">
      <h2>Game Rules Testing</h2>

      <div className="game-rules-test-panel__section">
        <label htmlFor="game-mode-select">Game Mode:</label>
        <select
          id="game-mode-select"
          value={selectedGameMode}
          onChange={(e) => setSelectedGameMode(e.target.value)}
          disabled={isGenerating}
        >
          <option value="claim">Claim</option>
          <option value="threecardbrag">Three Card Brag</option>
        </select>
      </div>

      <div className="game-rules-test-panel__section">
        <h3>Test Scenarios</h3>
        {TEST_SCENARIOS.map((scenario, index) => (
          <button
            key={index}
            onClick={() => handleTestScenario(scenario)}
            disabled={!modelId || isGenerating}
            className="game-rules-test-panel__scenario-button"
          >
            {scenario.name}
          </button>
        ))}
      </div>

      <div className="game-rules-test-panel__section">
        <button
          onClick={handleCustomTest}
          disabled={!modelId || isGenerating}
          className="game-rules-test-panel__custom-button"
        >
          Test with GameMode Rules
        </button>
      </div>

      {isGenerating && (
        <div className="game-rules-test-panel__section">
          <button onClick={handleStop} className="game-rules-test-panel__stop-button">
            Stop Generation
          </button>
        </div>
      )}

      <div className="game-rules-test-panel__response">
        <h3>Response:</h3>
        <div className="game-rules-test-panel__response-content">
          {isGenerating && currentStreaming ? (
            <>
              {currentStreaming}
              <span className="game-rules-test-panel__cursor">▊</span>
            </>
          ) : (
            testResponse || 'No response yet. Run a test scenario.'
          )}
        </div>
      </div>
    </div>
  )
}


