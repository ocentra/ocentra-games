import { useState, useEffect, useRef } from 'react'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ModelLoadedEvent } from '@ocentra/eventing-domain/events/model/ModelLoadedEvent'
import {
  DEFAULT_INFERENCE_SETTINGS,
  type InferenceSettings,
} from '@ocentra/ai-domain/types/inference-settings';
import {
  getInferenceSettings,
  saveInferenceSettings,
  getModelQuantSettings,
  saveModelQuantSettings,
  clearModelQuantSettings,
  getLastLoadedModel,
} from '@ocentra/ai-domain/api/ui-settings';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { SystemPromptPopup } from '@/ui/components/SystemPromptPopup'
import './InferenceSettingsTab.css'

const log = MainAppLogger.instance

interface SettingDefinition {
  key: keyof InferenceSettings
  label: string
  type: 'slider' | 'input' | 'checkbox' | 'textarea'
  min?: number
  max?: number
  step?: number
  defaultValue: number | boolean | string | null
  description: string
  example: string
}

const COMMON_SETTINGS: SettingDefinition[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    type: 'slider',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 0.2,
    description: `Controls how creative or predictable the AI's responses are. Lower values make the AI more strict and focused—great for coding, technical answers, or when you want fewer made-up (hallucinated) details. Higher values make the AI more creative and varied—useful for brainstorming, stories, or blog posts, but can sometimes lead to less accurate or more imaginative answers.`,
    example: `Use 0.1–0.3 for precise tasks like code or factual Q&A. 0.7–1.0 for balanced conversation. 1.2–1.8 for creative writing or idea generation.`
  },
  {
    key: 'max_new_tokens',
    label: 'Max New Tokens',
    type: 'slider',
    min: 50,
    max: 4096,
    step: 50,
    defaultValue: 1024,
    description: `Limits how many new words or pieces (tokens) the AI can add to its answer. Lower values keep responses short and to the point. Higher values allow for longer, more detailed answers.`,
    example: `100 = concise answers, 500 = paragraphs, 1024 = detailed explanations, 2048+ = very long responses.`
  },
  {
    key: 'top_k',
    label: 'Top K',
    type: 'slider',
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 3,
    description: `Controls how many word choices the AI considers at each step. Lower values make the AI more focused and repetitive. Higher values allow for more variety and creativity, but can sometimes make answers less predictable.`,
    example: `1 = most focused (greedy), 3 = very focused (official example), 10 = focused, 50 = balanced, 100 = very diverse.`
  },
  {
    key: 'top_p',
    label: 'Top P',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.9,
    description: `Lets the AI pick from the most likely words until their combined probability reaches P. Lower values make answers more predictable and safe. Higher values allow for more diverse and surprising responses.`,
    example: `0.5 = very focused, 0.9 = balanced, 1.0 = most creative. Use lower for technical tasks, higher for creative writing.`
  },
  {
    key: 'repetition_penalty',
    label: 'Repetition Penalty',
    type: 'slider',
    min: 1.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 1.2,
    description: `Discourages the AI from repeating itself. Higher values mean less repetition, but if set too high, the AI might avoid repeating important words.`,
    example: `1.0 = no penalty, 1.1 = mild, 1.3 = strong penalty. Increase if you notice repeated phrases.`
  },
  {
    key: 'do_sample',
    label: 'Do Sample',
    type: 'checkbox',
    defaultValue: true,
    description: `When ON, the AI will generate more varied and creative answers by sampling from possible words. When OFF, the AI will always pick the most likely next word, making answers more predictable and less creative.`,
    example: `ON = creative, varied output. OFF = more predictable, sometimes repetitive.`
  },
  {
    key: 'json_mode',
    label: 'JSON Output Mode',
    type: 'checkbox',
    defaultValue: false,
    description: `When enabled, the AI will only respond in valid JSON format for structured data extraction. Useful for extracting entities like person names, organizations, and locations from text.`,
    example: `Enable when you need structured data output. Disable for normal conversational responses.`
  },
]

const ADVANCED_SETTINGS: SettingDefinition[] = [
  {
    key: 'max_length',
    label: 'Max Length',
    type: 'slider',
    min: 512,
    max: 32768,
    step: 512,
    defaultValue: 8192,
    description: `Sets the maximum total length (in tokens) for the AI's answer, including your question and the response. A higher value allows for longer, more detailed answers, but may take longer to generate.`,
    example: `Use 2048 for short answers, 8192 for medium, 16384+ for long explanations or stories.`
  },
  {
    key: 'min_length',
    label: 'Min Length',
    type: 'slider',
    min: 0,
    max: 500,
    step: 10,
    defaultValue: 0,
    description: `Sets the minimum length (in tokens) for the AI's answer. Use this if you want to make sure the response is at least a certain size (for example, always a full sentence or paragraph).`,
    example: `0 = no minimum, 10 = at least a sentence, 50 = paragraph.`
  },
  {
    key: 'typical_p',
    label: 'Typical P',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 1.0,
    description: `Controls the typicality of generated tokens. Lower values make the AI choose more typical/common words, while higher values allow for more unusual word choices. Works alongside top_p for better control.`,
    example: `0.5 = more typical/common words, 1.0 = balanced, 0.95 = more unusual word choices.`
  },
  {
    key: 'num_beams',
    label: 'Num Beams',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 1,
    description: `Controls how many different answer paths the AI explores before picking the best one. Higher values can improve answer quality but may take longer.`,
    example: `1 = no beam search (faster), 3–5 = better quality, 10+ = very thorough (slower).`
  },
  {
    key: 'encoder_repetition_penalty',
    label: 'Encoder Repetition Penalty',
    type: 'slider',
    min: 1.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 1.0,
    description: `Penalty for repetition in the input/encoder part. Higher values reduce repetition in the source text influence.`,
    example: `1.0 = no penalty, 1.1 = mild penalty, 1.3 = strong penalty.`
  },
  {
    key: 'no_repeat_ngram_size',
    label: 'No Repeat Ngram Size',
    type: 'slider',
    min: 0,
    max: 5,
    step: 1,
    defaultValue: 3,
    description: `Prevents the AI from repeating the same sequence of words. Higher values prevent longer repeated phrases but may limit fluency.`,
    example: `0 = no control, 2 = no repeated pairs, 3 = no repeated triplets (optimal), 4+ = very restrictive.`
  },
  {
    key: 'min_new_tokens',
    label: 'Min New Tokens',
    type: 'slider',
    min: 0,
    max: 500,
    step: 10,
    defaultValue: 0,
    description: `The minimum number of new words or pieces (tokens) the AI must generate. Use this to ensure answers are not too short.`,
    example: `0 = no minimum, 10 = at least 10 new words.`
  },
  {
    key: 'epsilon_cutoff',
    label: 'Epsilon Cutoff',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.0,
    description: `Filters out tokens with probability less than this value. Lower values allow more diverse tokens, higher values filter out less likely tokens.`,
    example: `0.0 = no filtering, 0.1 = filter very unlikely tokens, 0.5 = filter moderately unlikely tokens.`
  },
  {
    key: 'eta_cutoff',
    label: 'Eta Cutoff',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.0,
    description: `Similar to epsilon_cutoff but uses a different filtering method. Can be used alongside epsilon_cutoff for more precise control.`,
    example: `0.0 = no filtering, 0.1 = light filtering, 0.5 = strong filtering.`
  },
  {
    key: 'diversity_penalty',
    label: 'Diversity Penalty',
    type: 'slider',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 0.0,
    description: `Encourages the AI to make each answer in a batch more different from the others. Useful if you want a variety of ideas or styles in multiple responses.`,
    example: `0.0 = no penalty, 0.5 = some variety, 1.0 = high diversity. Use higher values when generating many answers at once.`
  },
  {
    key: 'early_stopping',
    label: 'Early Stopping',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will stop generating as soon as it thinks the answer is complete. When OFF, it will keep going until the maximum length is reached.`,
    example: `ON = shorter, more natural endings. OFF = longer, may run on.`
  },
  {
    key: 'length_penalty',
    label: 'Length Penalty',
    type: 'slider',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    defaultValue: 0.8,
    description: `Controls whether the AI prefers shorter or longer answers. Lower values make answers shorter, higher values make them longer.`,
    example: `<1.0 = shorter, 1.0 = neutral, >1.0 = longer answers.`
  },
  {
    key: 'num_beam_groups',
    label: 'Num Beam Groups',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
    defaultValue: 1,
    description: `Splits the answer search into groups for more variety. Useful for getting different styles or ideas in multiple answers.`,
    example: `1 = standard, 2+ = more diverse answers (when batch size > 1).`
  },
  {
    key: 'penalty_alpha',
    label: 'Penalty Alpha',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.0,
    description: `Affects how much the AI penalizes less likely words. Higher values can make answers more focused, but may reduce creativity.`,
    example: `0.0 = disabled, 0.6 = balanced, 0.9 = strong penalty.`
  },
  {
    key: 'encoder_no_repeat_ngram_size',
    label: 'Encoder No Repeat Ngram Size',
    type: 'input',
    defaultValue: 0,
    description: `Prevents the AI from repeating n-grams that appear in the input text. Useful for avoiding copying from the source.`,
    example: `0 = allow repeats, 2 = no repeated pairs from input, 3 = no repeated triplets from input.`
  },
  {
    key: 'num_return_sequences',
    label: 'Num Return Sequences',
    type: 'input',
    defaultValue: 1,
    description: `How many different answers the AI should return for your question. Use more than 1 to see a variety of responses.`,
    example: `1 = single answer, 3 = three options, 5+ = many choices.`
  },
  {
    key: 'output_attentions',
    label: 'Output Attentions',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will include extra data about how it paid attention to each word. Useful for advanced users or debugging, but not needed for most people.`,
    example: `ON = include attention data (slower), OFF = text only.`
  },
  {
    key: 'output_hidden_states',
    label: 'Output Hidden States',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will include its internal state data. Useful for research or advanced analysis, but not needed for most users.`,
    example: `ON = include internal states (memory intensive), OFF = text only.`
  },
  {
    key: 'output_scores',
    label: 'Output Scores',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will include confidence scores for each word it generates. Useful for advanced users or debugging.`,
    example: `ON = include confidence scores, OFF = text only.`
  },
  {
    key: 'return_dict_in_generate',
    label: 'Return Dict In Generate',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will return a detailed object with extra info about the answer. Useful for advanced users or developers.`,
    example: `ON = detailed output, OFF = simple text.`
  },
  {
    key: 'use_cache',
    label: 'Use Cache',
    type: 'checkbox',
    defaultValue: true,
    description: `When ON, the AI remembers previous answers to speed up follow-up responses. Uses more memory, but makes things faster.`,
    example: `ON = faster, OFF = slower but uses less memory.`
  },
  {
    key: 'remove_invalid_values',
    label: 'Remove Invalid Values',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will remove any invalid or strange values from its output. Useful if you see weird symbols or errors in answers.`,
    example: `ON = clean output, OFF = allow all values.`
  },
  {
    key: 'renormalize_logits',
    label: 'Renormalize Logits',
    type: 'checkbox',
    defaultValue: false,
    description: `When ON, the AI will normalize the probability scores to ensure they add up to 1.0. Can help with numerical stability.`,
    example: `ON = normalized probabilities, OFF = raw probabilities.`
  },
  {
    key: 'guidance_scale',
    label: 'Guidance Scale',
    type: 'slider',
    min: 1.0,
    max: 20.0,
    step: 0.1,
    defaultValue: 1.0,
    description: `Controls how closely the AI follows the input prompt. Higher values make the AI stick more closely to the prompt, but may reduce creativity.`,
    example: `1.0 = normal guidance, 3.0 = strong guidance, 7.5 = very strong guidance.`
  },
]

export function InferenceSettingsTab() {
  const [settings, setSettings] = useState<InferenceSettings>(DEFAULT_INFERENCE_SETTINGS)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [commonExpanded, setCommonExpanded] = useState(true)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [currentModel, setCurrentModel] = useState<{ repoId: string; quantPath: string } | null>(null)
  const [showSystemPromptPopup, setShowSystemPromptPopup] = useState(false)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; description: string; example: string } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadSettings()

    const handleModelLoaded = () => {
      // Reload settings when model changes
      loadSettings()
    }

    EventBus.instance.subscribe(ModelLoadedEvent, handleModelLoaded)

    return () => {
      EventBus.instance.unsubscribe(ModelLoadedEvent, handleModelLoaded)
    }
  }, [])

  const loadSettings = async (modelId?: string, quantPath?: string) => {
    try {
      let loadedSettings: InferenceSettings | null = null

      if (modelId && quantPath) {
        loadedSettings = await getModelQuantSettings(modelId, quantPath)
        setCurrentModel({ repoId: modelId, quantPath })
      } else {
        const lastModel = await getLastLoadedModel()
        if (lastModel) {
          loadedSettings = await getModelQuantSettings(lastModel.repoId, lastModel.quantPath)
          setCurrentModel({ repoId: lastModel.repoId, quantPath: lastModel.quantPath })
        } else {
          loadedSettings = await getInferenceSettings()
        }
      }

      const finalSettings = loadedSettings || DEFAULT_INFERENCE_SETTINGS
      setSettings(finalSettings)
      setEnabled(finalSettings.enabled || {})
    } catch (error) {
      log.logError('Failed to load settings:', getStackTrace(), error)
      setSettings(DEFAULT_INFERENCE_SETTINGS)
      setEnabled({})
    }
  }

  const saveSettings = async (newSettings: InferenceSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentModel) {
          await saveModelQuantSettings(currentModel.repoId, currentModel.quantPath, newSettings)
        } else {
          await saveInferenceSettings(newSettings)
        }
      } catch (error) {
        log.logError('Failed to save settings:', getStackTrace(), error)
      }
    }, 200)
  }

  const handleSettingChange = (key: keyof InferenceSettings, value: number | boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const handleEnabledChange = (key: string, isEnabled: boolean) => {
    const newEnabled = { ...enabled, [key]: isEnabled }
    setEnabled(newEnabled)
    const newSettings = { ...settings, enabled: newEnabled }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const handleReset = async () => {
    try {
      if (currentModel) {
        await clearModelQuantSettings(currentModel.repoId, currentModel.quantPath)
      } else {
        await saveInferenceSettings(DEFAULT_INFERENCE_SETTINGS)
      }
      await loadSettings()
    } catch (error) {
      log.logError('Failed to reset settings:', getStackTrace(), error)
    }
  }

  const handleSystemPromptSave = async (newPrompt: string) => {
    handleSettingChange('system_prompt', newPrompt)
    setShowSystemPromptPopup(false)
  }

  const showTooltip = (e: React.MouseEvent<HTMLButtonElement>, description: string, example: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      x: rect.left - 10,
      y: rect.top + rect.height / 2,
      description,
      example
    })
  }

  const hideTooltip = () => {
    setTooltip(null)
  }

  useEffect(() => {
    if (tooltip && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      let x = tooltip.x - tooltipRect.width - 10
      const y = tooltip.y - tooltipRect.height / 2

      if (x < 0) {
        x = tooltip.x + 30
      }

      tooltipRef.current.style.left = `${x}px`
      tooltipRef.current.style.top = `${y}px`
    }
  }, [tooltip])

  const renderSetting = (setting: SettingDefinition) => {
    const value = settings[setting.key]
    const isEnabled = enabled[setting.key] ?? (setting.type === 'checkbox' ? true : false)

    return (
      <div key={setting.key} className="setting-row">
        <label className="setting-label">{setting.label}</label>
        
        {setting.type === 'slider' && (
          <>
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={value as number}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
              className="setting-slider"
              aria-label={setting.label}
            />
            <span className="setting-value">{String(value)}</span>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleEnabledChange(setting.key, e.target.checked)}
              className="setting-enabled"
              title="Enable this parameter"
              aria-label={`Enable ${setting.label}`}
            />
          </>
        )}

        {setting.type === 'input' && (
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
            className="setting-input"
            aria-label={setting.label}
          />
        )}

        {setting.type === 'checkbox' && (
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
            className="setting-checkbox"
            aria-label={setting.label}
          />
        )}

        <button
          className="setting-info"
          onMouseEnter={(e) => showTooltip(e, setting.description, setting.example)}
          onMouseLeave={hideTooltip}
        >
          ?
        </button>
      </div>
    )
  }

  return (
    <div className="inference-settings-tab">
      <div className="settings-header-actions">
        <button onClick={handleReset} className="reset-btn">
          Reset to Defaults
        </button>
        <button onClick={() => loadSettings()} className="reload-btn">
          Reload
        </button>
      </div>

      <div className="system-prompt-section">
        <div className="system-prompt-header">
          <span>System Prompt</span>
          <div className="system-prompt-actions">
            <button
              className="expand-btn"
              onClick={() => setShowSystemPromptPopup(true)}
              title="Expand"
            >
              📋
            </button>
            <button
              className="info-btn"
              onMouseEnter={(e) => {
                const desc = 'The system prompt sets the AI\'s role and behavior. This is prepended to every conversation to guide the AI\'s responses.'
                const ex = 'Example: "You are a helpful assistant" or "You are a game AI that makes strategic decisions"'
                showTooltip(e, desc, ex)
              }}
              onMouseLeave={hideTooltip}
              title="Info"
            >
              ?
            </button>
          </div>
        </div>
        <textarea
          value={settings.system_prompt}
          onChange={(e) => handleSettingChange('system_prompt', e.target.value)}
          className="system-prompt-textarea"
          rows={8}
          aria-label="System prompt"
        />
      </div>

      {showSystemPromptPopup && (
        <SystemPromptPopup
          currentPrompt={settings.system_prompt}
          onSave={handleSystemPromptSave}
          onClose={() => setShowSystemPromptPopup(false)}
        />
      )}

      {tooltip && (
        <div
          ref={tooltipRef}
          className="setting-tooltip"
        >
          <div className="tooltip-description">{tooltip.description}</div>
          <div className="tooltip-example">Example: {tooltip.example}</div>
        </div>
      )}

      <div className="common-settings-section">
        <button
          className="section-toggle"
          onClick={() => setCommonExpanded(!commonExpanded)}
        >
          <span>Common Settings</span>
          <span className={`fold-icon ${commonExpanded ? 'expanded' : ''}`}>▼</span>
        </button>
        {commonExpanded && (
          <div className="settings-list">
            {COMMON_SETTINGS.map(renderSetting)}
          </div>
        )}
      </div>

      <div className="advanced-settings-section">
        <button
          className="section-toggle"
          onClick={() => setAdvancedExpanded(!advancedExpanded)}
        >
          <span>Advanced Settings</span>
          <span className={`fold-icon ${advancedExpanded ? 'expanded' : ''}`}>▼</span>
        </button>
        {advancedExpanded && (
          <div className="settings-list">
            {ADVANCED_SETTINGS.map(renderSetting)}
          </div>
        )}
      </div>
    </div>
  )
}

