declare module 'kokoro-js' {
  export interface KokoroGenerateOptions {
    voice?: string
    speed?: number
  }

  export interface KokoroTTSInstance {
    generate(text: string, options?: KokoroGenerateOptions): Promise<{
      save: (path: string) => Promise<void>
      arrayBuffer: () => Promise<ArrayBuffer>
    }>
    list_voices(): Promise<string[]>
  }

  export interface KokoroTTSConfig {
    dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
  }

  export class KokoroTTS {
    static from_pretrained(modelId: string, config?: KokoroTTSConfig): Promise<KokoroTTSInstance>
  }
}
