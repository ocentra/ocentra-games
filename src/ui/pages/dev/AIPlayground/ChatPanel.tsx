import React, { useState, useEffect, useRef } from 'react'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { RequestModelGenerateEvent } from '@ocentra/eventing-domain/events/model/RequestModelGenerateEvent';
import { RequestModelStopEvent } from '@ocentra/eventing-domain/events/model/RequestModelStopEvent';
import { ModelGenerationUpdateEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationUpdateEvent';
import { ModelGenerationCompleteEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationCompleteEvent';
import { ModelGenerationStoppedEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationStoppedEvent';
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

interface ChatPanelProps {
  modelId: string | null
  quantPath?: string | null
  onMetricsUpdate: (metrics: { ttft?: number; tps?: string; numTokens?: number }) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ modelId, onMetricsUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subscribe to generation events
    const handleUpdate = (event: ModelGenerationUpdateEvent) => {
      setCurrentResponse((prev) => prev + event.update.token)
      onMetricsUpdate({
        tps: event.update.tps,
        numTokens: event.update.numTokens,
      })
    }

    const handleComplete = (event: ModelGenerationCompleteEvent) => {
      setIsGenerating(false)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: event.complete.text,
          timestamp: Date.now(),
        },
      ])
      setCurrentResponse('')
      onMetricsUpdate({
        ttft: event.complete.ttft,
        tps: event.complete.tps,
        numTokens: event.complete.numTokens,
      })
    }

    const handleStopped = (event: ModelGenerationStoppedEvent) => {
      setIsGenerating(false)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: event.stopped.text,
          timestamp: Date.now(),
        },
      ])
      setCurrentResponse('')
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse])

  const handleSend = async () => {
    if (!input.trim() || !modelId || isGenerating) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)
    setCurrentResponse('')

    try {
      const event = new RequestModelGenerateEvent({
        systemMessage: 'You are a helpful AI assistant.',
        userPrompt: input,
      })
      EventBus.instance.publish(event)
      await event.deferred.promise
    } catch (error) {
      logError('Generation error:', { data: error })
      setIsGenerating(false)
      setCurrentResponse('')
    }
  }

  const handleStop = () => {
    EventBus.instance.publish(new RequestModelStopEvent())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      <h2>Chat</h2>
      
      <div className="chat-panel__messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-panel__message chat-panel__message--${message.role}`}>
            <div className="chat-panel__message-role">{message.role === 'user' ? 'You' : 'AI'}</div>
            <div className="chat-panel__message-content">{message.content}</div>
          </div>
        ))}
        {isGenerating && currentResponse && (
          <div className="chat-panel__message chat-panel__message--assistant">
            <div className="chat-panel__message-role">AI</div>
            <div className="chat-panel__message-content chat-panel__message-content--streaming">
              {currentResponse}
              <span className="chat-panel__cursor">▊</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={!modelId || isGenerating}
          rows={3}
        />
        <div className="chat-panel__actions">
          {isGenerating ? (
            <button onClick={handleStop} className="chat-panel__button chat-panel__button--stop">
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !modelId}
              className="chat-panel__button chat-panel__button--send"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


