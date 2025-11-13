// ==========================================
// Token 计数服务
// ==========================================
//
// 使用 tiktoken 精确计算 Token 数量
// 支持多种模型的 Token 计数
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { get_encoding, encoding_for_model } from 'tiktoken'

/**
 * 消息接口
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Token 计数服务类
 */
export class TokenCounter {
  /**
   * 计算单条消息的 Token 数（用于 GPT 系列模型）
   */
  countMessageTokens(messages: ChatMessage[], modelName: string = 'gpt-4o'): number {
    try {
      // 获取编码器
      let encoding
      try {
        encoding = encoding_for_model(modelName as any)
      } catch {
        // 如果模型不支持，使用 cl100k_base（GPT-4、GPT-3.5-turbo 的编码）
        encoding = get_encoding('cl100k_base')
      }

      let numTokens = 0

      for (const message of messages) {
        // 每条消息的开销（OpenAI 格式）
        numTokens += 4 // <im_start>{role/name}\n{content}<im_end>\n

        // 计算角色和内容的 tokens
        numTokens += encoding.encode(message.role).length
        numTokens += encoding.encode(message.content).length
      }

      // 额外的回复开销
      numTokens += 2 // <im_start>assistant

      encoding.free()

      return numTokens
    } catch (error) {
      console.error('Token 计数失败:', error)
      // 兜底：粗略估算（1 token ≈ 4 个字符）
      const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
      return Math.ceil(totalChars / 4)
    }
  }

  /**
   * 计算文本的 Token 数
   */
  countTextTokens(text: string, modelName: string = 'gpt-4o'): number {
    try {
      let encoding
      try {
        encoding = encoding_for_model(modelName as any)
      } catch {
        encoding = get_encoding('cl100k_base')
      }

      const tokens = encoding.encode(text)
      const count = tokens.length

      encoding.free()

      return count
    } catch (error) {
      console.error('Token 计数失败:', error)
      // 兜底：粗略估算
      return Math.ceil(text.length / 4)
    }
  }

  /**
   * 根据 Token 数量估算成本
   * @param inputTokens 输入 Token 数
   * @param outputTokens 输出 Token 数
   * @param inputPrice 输入单价（每 1K tokens）
   * @param outputPrice 输出单价（每 1K tokens）
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    inputPrice: number,
    outputPrice: number
  ): number {
    const inputCost = (inputTokens / 1000) * inputPrice
    const outputCost = (outputTokens / 1000) * outputPrice
    return inputCost + outputCost
  }

  /**
   * 检查消息是否超过模型上下文窗口
   */
  isWithinContextWindow(
    tokenCount: number,
    contextWindow: number,
    reserveTokens: number = 1000
  ): boolean {
    return tokenCount + reserveTokens <= contextWindow
  }

  /**
   * 截断消息以适应上下文窗口
   * 保留最新的消息，删除最旧的消息
   */
  truncateMessages(
    messages: ChatMessage[],
    maxTokens: number,
    modelName: string = 'gpt-4o'
  ): ChatMessage[] {
    // 始终保留第一条消息（通常是系统提示）
    const systemMessage = messages[0]?.role === 'system' ? messages[0] : null
    const otherMessages = systemMessage ? messages.slice(1) : messages

    const result: ChatMessage[] = systemMessage ? [systemMessage] : []
    let currentTokens = systemMessage ? this.countMessageTokens([systemMessage], modelName) : 0

    // 从最新的消息开始添加
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i]
      const messageTokens = this.countMessageTokens([message], modelName)

      if (currentTokens + messageTokens <= maxTokens) {
        result.unshift(message)
        currentTokens += messageTokens
      } else {
        break
      }
    }

    return systemMessage ? [systemMessage, ...result.slice(1)] : result
  }
}

// 导出单例
export const tokenCounter = new TokenCounter()
