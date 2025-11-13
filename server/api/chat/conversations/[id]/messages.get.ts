// ==========================================
// 获取对话历史 API
// ==========================================
//
// GET /api/chat/conversations/:id/messages
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    const conversationId = getRouterParam(event, 'id')

    if (!conversationId) {
      throw createError({
        statusCode: 400,
        message: '对话 ID 不能为空'
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

    // 获取消息历史
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        inputTokens: true,
        outputTokens: true,
        cost: true,
        createdAt: true,
        model: {
          select: {
            id: true,
            modelName: true,
            displayName: true
          }
        }
      }
    })

    return {
      success: true,
      data: {
        conversation,
        messages
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取对话历史失败: ${error.message}`
    })
  }
})
