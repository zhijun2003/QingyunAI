// ==========================================
// 清云AI - AI Runtime Types
// ==========================================
//
// AI 运行时类型定义
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import type { Provider, Model, ModelCategory, BillingType, ProviderType } from '@qingyun/database'

/**
 * AI 请求消息
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

/**
 * AI 请求参数
 */
export interface AIRequest {
  provider: Provider
  model: Model
  messages: AIMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  functions?: AIFunction[]
  function_call?: 'auto' | 'none' | { name: string }
}

/**
 * AI 函数定义
 */
export interface AIFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/**
 * AI 响应
 */
export interface AIResponse {
  id: string
  content: string
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter'
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  function_call?: {
    name: string
    arguments: string
  }
}

/**
 * 流式响应块
 */
export interface AIStreamChunk {
  id: string
  delta: {
    role?: 'assistant'
    content?: string
    function_call?: {
      name?: string
      arguments?: string
    }
  }
  finish_reason?: 'stop' | 'length' | 'function_call' | 'content_filter'
}

/**
 * 模型信息（从 Provider 拉取）
 */
export interface ModelInfo {
  modelName: string
  displayName: string
  category: ModelCategory
  maxTokens?: number
  contextWindow?: number
  inputPrice?: number
  outputPrice?: number
  perCallPrice?: number
  perSecondPrice?: number
  billingType: BillingType
  supportStream?: boolean
  supportVision?: boolean
  supportFunction?: boolean
}

/**
 * Provider 适配器接口
 */
export interface IProviderAdapter {
  /**
   * 拉取模型列表
   */
  fetchModels(): Promise<ModelInfo[]>

  /**
   * 发送对话请求
   */
  chat(request: AIRequest): Promise<AIResponse>

  /**
   * 发送流式对话请求
   */
  chatStream(request: AIRequest): AsyncGenerator<AIStreamChunk>

  /**
   * 测试连接
   */
  testConnection(): Promise<boolean>
}

/**
 * 适配器配置
 */
export interface AdapterConfig {
  provider: Provider
  apiKey: string
}

/**
 * Token 计数结果
 */
export interface TokenCount {
  tokens: number
  model: string
}

/**
 * 成本计算结果
 */
export interface CostCalculation {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  model: string
}
