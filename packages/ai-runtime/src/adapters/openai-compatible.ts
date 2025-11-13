// ==========================================
// OpenAI 兼容适配器
// ==========================================
//
// 支持 OpenAI 官方和所有 OpenAI 兼容接口
// 如：云雾AI、NewAPI、API2D 等
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import type { IProviderAdapter, ModelInfo, AIRequest, AIResponse, AIStreamChunk, AdapterConfig } from '../types'

export class OpenAICompatibleAdapter implements IProviderAdapter {
  private config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  /**
   * 拉取模型列表
   */
  async fetchModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.config.provider.baseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('返回的模型列表格式不正确')
    }

    // 转换为统一的 ModelInfo 格式
    return data.data.map((model: any) => this.parseModel(model))
  }

  /**
   * 解析模型信息
   */
  private parseModel(model: any): ModelInfo {
    const modelName = model.id || model.model

    return {
      modelName,
      displayName: this.getDisplayName(modelName),
      category: this.inferCategory(modelName),
      maxTokens: model.max_tokens || this.getDefaultMaxTokens(modelName),
      contextWindow: model.context_length || this.getDefaultContextWindow(modelName),
      inputPrice: model.pricing?.prompt || model.pricing?.input,
      outputPrice: model.pricing?.completion || model.pricing?.output,
      perCallPrice: model.pricing?.image,
      billingType: this.inferBillingType(modelName),
      supportStream: true,
      supportVision: this.checkVisionSupport(modelName),
      supportFunction: this.checkFunctionSupport(modelName)
    }
  }

  /**
   * 获取显示名称
   */
  private getDisplayName(modelName: string): string {
    // 移除常见的前缀和版本号
    return modelName
      .replace(/^(openai\/|anthropic\/|google\/)/, '')
      .replace(/-\d{8}$/, '') // 移除日期后缀
  }

  /**
   * 推断模型类别
   */
  private inferCategory(modelName: string): ModelInfo['category'] {
    const name = modelName.toLowerCase()

    if (name.includes('dall-e') || name.includes('sd') || name.includes('stable-diffusion')) {
      return 'IMAGE'
    }
    if (name.includes('whisper') || name.includes('tts')) {
      return 'AUDIO'
    }
    if (name.includes('embedding')) {
      return 'EMBEDDING'
    }
    if (name.includes('gpt') || name.includes('claude') || name.includes('gemini')) {
      return 'CHAT'
    }

    return 'CHAT' // 默认为对话模型
  }

  /**
   * 推断计费类型
   */
  private inferBillingType(modelName: string): ModelInfo['billingType'] {
    const name = modelName.toLowerCase()

    if (name.includes('dall-e') || name.includes('image')) {
      return 'CALL'
    }

    return 'TOKEN'
  }

  /**
   * 检查是否支持视觉
   */
  private checkVisionSupport(modelName: string): boolean {
    const name = modelName.toLowerCase()
    return name.includes('vision') || name.includes('gpt-4o') || name.includes('claude-3')
  }

  /**
   * 检查是否支持函数调用
   */
  private checkFunctionSupport(modelName: string): boolean {
    const name = modelName.toLowerCase()
    return name.includes('gpt-4') || name.includes('gpt-3.5')
  }

  /**
   * 获取默认最大 tokens
   */
  private getDefaultMaxTokens(modelName: string): number {
    const name = modelName.toLowerCase()

    if (name.includes('gpt-4o')) return 4096
    if (name.includes('gpt-4')) return 8192
    if (name.includes('gpt-3.5')) return 4096
    if (name.includes('claude-3')) return 4096

    return 2048
  }

  /**
   * 获取默认上下文窗口
   */
  private getDefaultContextWindow(modelName: string): number {
    const name = modelName.toLowerCase()

    if (name.includes('gpt-4o')) return 128000
    if (name.includes('gpt-4-turbo')) return 128000
    if (name.includes('gpt-4')) return 8192
    if (name.includes('gpt-3.5-turbo-16k')) return 16384
    if (name.includes('gpt-3.5')) return 4096
    if (name.includes('claude-3')) return 200000

    return 4096
  }

  /**
   * 发送对话请求
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${this.config.provider.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model.modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        stream: false,
        functions: request.functions,
        function_call: request.function_call
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AI 请求失败: ${response.status} ${error}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      content: data.choices[0].message.content || '',
      finish_reason: data.choices[0].finish_reason,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      },
      function_call: data.choices[0].message.function_call
    }
  }

  /**
   * 发送流式对话请求
   */
  async *chatStream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    const response = await fetch(`${this.config.provider.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model.modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        stream: true,
        functions: request.functions,
        function_call: request.function_call
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AI 流式请求失败: ${response.status} ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json.choices[0].delta

              yield {
                id: json.id,
                delta: {
                  role: delta.role,
                  content: delta.content,
                  function_call: delta.function_call
                },
                finish_reason: json.choices[0].finish_reason
              }
            } catch (e) {
              console.error('解析流式响应失败:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.provider.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('测试连接失败:', error)
      return false
    }
  }
}
