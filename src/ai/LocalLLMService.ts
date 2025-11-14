// LocalLLMService.ts
// Local LLM service implementation using transformers.js
// Adapted from Unity's LocalLLMService.cs

import type { ILLMService } from './interfaces/ILLMService'
import { TextGenerationPipeline } from '@/lib/pipelines/TextGenerationPipeline'
import { TextGenerationConfig } from '@/lib/pipelines/PipelineConfigs'
import { type DtypeSimple } from '@/lib/pipelines/PipelineTypes'
import { DEFAULT_INFERENCE_SETTINGS } from '@/lib/db/InferenceSettings'
import { getInferenceSettings, getModelQuantSettings } from '@/lib/db/idbModel'

const prefix = '[LocalLLMService]'
const LOG_GENERAL = false
const LOG_ERROR = true

/**
 * LocalLLMService - Implements ILLMService using transformers.js
 * Uses local models loaded via the pipeline system
 */
export class LocalLLMService implements ILLMService {
  private pipeline: TextGenerationPipeline | null = null
  private config: TextGenerationConfig | null = null
  private modelId: string | null = null
  private isInitialized: boolean = false

  /**
   * Initialize the service with a model
   */
  async Initialize(modelId: string, quantPath?: string): Promise<void> {
    try {
      if (LOG_GENERAL) {
        console.log(prefix, `[Initialize] Initializing with model: ${modelId}`)
      }

      this.modelId = modelId

      // Get inference settings (model-specific or default)
      let inferenceSettings = await getModelQuantSettings(modelId, quantPath || '')
      if (!inferenceSettings) {
        inferenceSettings = await getInferenceSettings()
        if (!inferenceSettings) {
          inferenceSettings = DEFAULT_INFERENCE_SETTINGS
        }
      }

      // Create pipeline and config
      this.pipeline = new TextGenerationPipeline()
      
      // Extract dtype from quantPath if provided
      let dtype: DtypeSimple | undefined
      if (quantPath) {
        // Extract dtype from quant path (e.g., "onnx/model_q4f16.onnx" -> "q4f16")
        const match = quantPath.match(/model_([a-z0-9]+)\.onnx/i)
        const candidate = match?.[1]
        const supportedDtypes: DtypeSimple[] = ['fp32', 'fp16', 'q8', 'q4', 'q4f16', 'int8', 'uint8', 'bnb4', 'auto']
        if (candidate && supportedDtypes.includes(candidate as DtypeSimple)) {
          dtype = candidate as DtypeSimple
        }
      }

      this.config = await TextGenerationConfig.createWithAutoDetect(modelId, {
        dtype,
        useExternalData: false,
      })

      // Load the pipeline
      await this.pipeline.load(this.config)

      this.isInitialized = true

      if (LOG_GENERAL) {
        console.log(prefix, `[Initialize] Successfully initialized`)
      }
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, `[Initialize] Error:`, error)
      }
      throw error
    }
  }

  /**
   * Get response from LLM asynchronously
   */
  async GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string> {
    if (!this.IsReady()) {
      throw new Error('LocalLLMService is not initialized. Call Initialize() first.')
    }

    try {
      if (LOG_GENERAL) {
        console.log(prefix, `[GetResponseAsync] Generating response`)
      }

      const tokenizer = this.pipeline!.getTokenizer()
      const model = this.pipeline!.getModel()

      if (!tokenizer || !model) {
        throw new Error('Pipeline components not loaded')
      }

      // Get inference settings
      let inferenceSettings = await getModelQuantSettings(this.modelId!, '')
      if (!inferenceSettings) {
        inferenceSettings = await getInferenceSettings()
        if (!inferenceSettings) {
          inferenceSettings = DEFAULT_INFERENCE_SETTINGS
        }
      }

      // Format messages for the model (matching TabAgent pattern)
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ]

      // Use apply_chat_template (matching TabAgent exactly)
      const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
      })

      // Generate response (matching TabAgent pattern)
      const result = await model.generate({
        ...inputs,
        max_new_tokens: inferenceSettings.max_new_tokens || 512,
        temperature: inferenceSettings.temperature || 0.7,
        top_p: inferenceSettings.top_p || 0.9,
        top_k: inferenceSettings.top_k || 50,
        do_sample: inferenceSettings.do_sample ?? true,
        repetition_penalty: inferenceSettings.repetition_penalty || 1.0,
        return_dict_in_generate: true,
      })

      // Decode response (matching TabAgent pattern)
      let finalDecodedText = ''
      if (result && typeof result === 'object' && 'sequences' in result) {
        const decoded = tokenizer.batch_decode(result.sequences.slice(inputs.input_ids.length), {
          skip_special_tokens: true,
        })
        finalDecodedText = Array.isArray(decoded) ? decoded[0] : decoded
      }

      const response = finalDecodedText.trim()

      if (LOG_GENERAL) {
        console.log(prefix, `[GetResponseAsync] Response generated: ${response.substring(0, 100)}...`)
      }

      return response
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, `[GetResponseAsync] Error:`, error)
      }
      throw error
    }
  }

  /**
   * Check if the service is ready
   */
  IsReady(): boolean {
    return this.isInitialized && this.pipeline !== null && this.pipeline.isLoaded()
  }

  /**
   * Dispose/cleanup the service
   */
  Dispose(): void {
    if (this.pipeline) {
      this.pipeline.reset()
      this.pipeline = null
    }
    this.config = null
    this.modelId = null
    this.isInitialized = false

    if (LOG_GENERAL) {
      console.log(prefix, `[Dispose] Service disposed`)
    }
  }
}

