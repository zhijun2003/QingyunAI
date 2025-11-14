// ==========================================
// AI 调用服务
// ==========================================
//
// 封装 AI 调用逻辑，处理：
// - API 密钥选择
// - 适配器调用
// - Token 计数和计费
// - 错误处理和重试
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { createAdapter } from '@qingyun/ai-runtime'
import type { AIRequest, AIResponse } from '@qingyun/ai-runtime'
import { apiKeyPool } from '@qingyun/ai-runtime'
import { tokenCounter } from './token-counter.service'

/**
 * AI 调用服务类
 */
export class AIChatService {
  /**
   * 发送对话请求（同步模式）
   */
  async chat(params: {
    userId: string
    conversationId: string
    modelId: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<{
    messageId: string
    content: string
    inputTokens: number
    outputTokens: number
    cost: number
  }> {
    const { userId, conversationId, modelId, messages, temperature, maxTokens } = params

    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true }
    })

    if (!model) {
      throw new Error('模型不存在')
    }

    if (!model.isActive) {
      throw new Error('模型已禁用')
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 计算输入 Token 数
    const inputTokens = tokenCounter.countMessageTokens(
      messages as any,
      model.modelName
    )

    // 检查是否超过上下文窗口
    if (!tokenCounter.isWithinContextWindow(inputTokens, model.contextWindow || 4096)) {
      throw new Error('消息长度超过模型上下文窗口限制')
    }

    // 获取可用的 API 密钥
    const { keyId, apiKey } = await apiKeyPool.getAvailableKey(model.providerId)

    try {
      // 创建适配器
      const adapter = createAdapter({
        provider: model.provider,
        apiKey
      })

      // 构建请求
      const request: AIRequest = {
        model: model.modelName,
        messages: messages as any,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || model.maxTokens || 2048,
        stream: false
      }

      // 调用 AI
      const response = await adapter.chat(request)

      // 计算输出 Token 数
      const outputTokens = tokenCounter.countTextTokens(
        response.content,
        model.modelName
      )

      // 计算费用
      const cost = tokenCounter.calculateCost(
        inputTokens,
        outputTokens,
        model.inputPrice || 0,
        model.outputPrice || 0
      )

      // 检查用户余额
      const totalBalance = user.balance + user.freeQuota
      if (totalBalance < cost) {
        throw new Error('余额不足，请充值')
      }

      // 保存用户消息
      const userMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: messages[messages.length - 1].content,
          modelId,
          inputTokens,
          outputTokens: 0,
          cost: 0
        }
      })

      // 保存 AI 回复
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: response.content,
          modelId,
          inputTokens,
          outputTokens,
          cost
        }
      })

      // 获取更新后的用户余额
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true, freeQuota: true }
      })
      const balanceBefore = updatedUser!.balance + updatedUser!.freeQuota

      // 扣除费用（优先扣除免费额度）
      if (user.freeQuota >= cost) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            freeQuota: { decrement: cost },
            totalSpent: { increment: cost },
            totalTokens: { increment: inputTokens + outputTokens }
          }
        })
      } else {
        const freeQuotaUsed = user.freeQuota
        const balanceUsed = cost - freeQuotaUsed

        await prisma.user.update({
          where: { id: userId },
          data: {
            freeQuota: 0,
            balance: { decrement: balanceUsed },
            totalSpent: { increment: cost },
            totalTokens: { increment: inputTokens + outputTokens }
          }
        })
      }

      // 计算费用组成
      const inputCost = tokenCounter.calculateCost(inputTokens, 0, model.inputPrice || 0, 0)
      const outputCost = tokenCounter.calculateCost(0, outputTokens, 0, model.outputPrice || 0)

      // 创建用量日志
      await prisma.usageLog.create({
        data: {
          userId,
          modelId,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputCost,
          outputCost,
          totalCost: cost,
          conversationId,
          messageId: assistantMessage.id
        }
      })

      // 创建交易记录
      await prisma.transaction.create({
        data: {
          userId,
          type: 'CONSUMPTION',
          amount: -cost,
          balanceBefore,
          balanceAfter: balanceBefore - cost,
          description: `AI对话消费 - ${model.displayName}`,
          relatedId: assistantMessage.id
        }
      })

      // 更新对话最后消息时间
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })

      // 重置密钥错误计数
      await apiKeyPool.resetErrorCount(keyId)

      return {
        messageId: assistantMessage.id,
        content: response.content,
        inputTokens,
        outputTokens,
        cost
      }
    } catch (error: any) {
      // 记录 API 密钥错误
      await apiKeyPool.recordError(keyId, error.message)

      throw new Error(`AI 调用失败: ${error.message}`)
    }
  }

  /**
   * 发送对话请求（流式模式）
   */
  async *chatStream(params: {
    userId: string
    conversationId: string
    modelId: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
  }): AsyncGenerator<{ content: string; done: boolean; messageId?: string; stats?: any }> {
    const { userId, conversationId, modelId, messages, temperature, maxTokens } = params

    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true }
    })

    if (!model) {
      throw new Error('模型不存在')
    }

    if (!model.isActive) {
      throw new Error('模型已禁用')
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 计算输入 Token 数
    const inputTokens = tokenCounter.countMessageTokens(
      messages as any,
      model.modelName
    )

    // 获取可用的 API 密钥
    const { keyId, apiKey } = await apiKeyPool.getAvailableKey(model.providerId)

    let fullContent = ''

    try {
      // 创建适配器
      const adapter = createAdapter({
        provider: model.provider,
        apiKey
      })

      // 构建请求
      const request: AIRequest = {
        model: model.modelName,
        messages: messages as any,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || model.maxTokens || 2048,
        stream: true
      }

      // 流式调用 AI
      for await (const chunk of adapter.chatStream(request)) {
        fullContent += chunk.content
        yield {
          content: chunk.content,
          done: false
        }
      }

      // 计算输出 Token 数
      const outputTokens = tokenCounter.countTextTokens(
        fullContent,
        model.modelName
      )

      // 计算费用
      const cost = tokenCounter.calculateCost(
        inputTokens,
        outputTokens,
        model.inputPrice || 0,
        model.outputPrice || 0
      )

      // 检查余额
      const totalBalance = user.balance + user.freeQuota
      if (totalBalance < cost) {
        throw new Error('余额不足，请充值')
      }

      // 保存用户消息
      await prisma.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: messages[messages.length - 1].content,
          modelId,
          inputTokens,
          outputTokens: 0,
          cost: 0
        }
      })

      // 保存 AI 回复
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: fullContent,
          modelId,
          inputTokens,
          outputTokens,
          cost
        }
      })

      // 获取更新前的用户余额
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true, freeQuota: true }
      })
      const balanceBefore = updatedUser!.balance + updatedUser!.freeQuota

      // 扣除费用
      if (user.freeQuota >= cost) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            freeQuota: { decrement: cost },
            totalSpent: { increment: cost },
            totalTokens: { increment: inputTokens + outputTokens }
          }
        })
      } else {
        const freeQuotaUsed = user.freeQuota
        const balanceUsed = cost - freeQuotaUsed

        await prisma.user.update({
          where: { id: userId },
          data: {
            freeQuota: 0,
            balance: { decrement: balanceUsed },
            totalSpent: { increment: cost },
            totalTokens: { increment: inputTokens + outputTokens }
          }
        })
      }

      // 计算费用组成
      const inputCost = tokenCounter.calculateCost(inputTokens, 0, model.inputPrice || 0, 0)
      const outputCost = tokenCounter.calculateCost(0, outputTokens, 0, model.outputPrice || 0)

      // 创建用量日志
      await prisma.usageLog.create({
        data: {
          userId,
          modelId,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          inputCost,
          outputCost,
          totalCost: cost,
          conversationId,
          messageId: assistantMessage.id
        }
      })

      // 创建交易记录
      await prisma.transaction.create({
        data: {
          userId,
          type: 'CONSUMPTION',
          amount: -cost,
          balanceBefore,
          balanceAfter: balanceBefore - cost,
          description: `AI对话消费 - ${model.displayName}`,
          relatedId: assistantMessage.id
        }
      })

      // 更新对话
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })

      // 重置密钥错误计数
      await apiKeyPool.resetErrorCount(keyId)

      // 发送完成信号
      yield {
        content: '',
        done: true,
        messageId: assistantMessage.id,
        stats: {
          inputTokens,
          outputTokens,
          cost
        }
      }
    } catch (error: any) {
      // 记录 API 密钥错误
      await apiKeyPool.recordError(keyId, error.message)

      throw new Error(`AI 调用失败: ${error.message}`)
    }
  }
}

// 导出单例
export const aiChatService = new AIChatService()
