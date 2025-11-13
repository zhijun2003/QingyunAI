// ==========================================
// 发送消息 API（同步模式）
// ==========================================
//
// POST /api/chat/send
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'
import { aiChatService } from '../../services/ai-chat.service'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    const body = await readBody(event)

    const { conversationId, modelId, content, temperature, maxTokens } = body

    if (!conversationId || !modelId || !content) {
      throw createError({
        statusCode: 400,
        message: '对话 ID、模型 ID 和消息内容不能为空'
      })
    }

    // 验证对话归属
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation) {
      throw createError({
        statusCode: 404,
        message: '对话不存在'
      })
    }

    if (conversation.userId !== currentUser.userId) {
      throw createError({
        statusCode: 403,
        message: '无权访问此对话'
      })
    }

    // 获取历史消息
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true
      },
      take: 20 // 只取最近 20 条消息
    })

    // 构建消息列表
    const messages = [
      ...history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content
      }
    ]

    // 调用 AI
    const result = await aiChatService.chat({
      userId: currentUser.userId,
      conversationId,
      modelId,
      messages,
      temperature,
      maxTokens
    })

    return {
      success: true,
      data: result
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: error.message || '发送消息失败'
    })
  }
})
