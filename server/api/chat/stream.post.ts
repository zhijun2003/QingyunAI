// ==========================================
// 发送消息 API（流式模式）
// ==========================================
//
// POST /api/chat/stream
//
// 使用 Server-Sent Events (SSE) 实现流式响应
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

    // 设置 SSE 响应头
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // 创建流式响应
    const stream = createEventStream(event)

    // 异步处理流式响应
    ;(async () => {
      try {
        for await (const chunk of aiChatService.chatStream({
          userId: currentUser.userId,
          conversationId,
          modelId,
          messages,
          temperature,
          maxTokens
        })) {
          // 发送数据块
          await stream.push(JSON.stringify(chunk))
        }

        // 关闭流
        await stream.close()
      } catch (error: any) {
        // 发送错误信息
        await stream.push(JSON.stringify({
          error: true,
          message: error.message || '发送消息失败'
        }))
        await stream.close()
      }
    })()

    return stream.send()
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: error.message || '发送消息失败'
    })
  }
})
