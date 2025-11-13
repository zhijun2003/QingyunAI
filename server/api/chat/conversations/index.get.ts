// ==========================================
// 获取对话列表 API
// ==========================================
//
// GET /api/chat/conversations
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)

    // 获取对话列表
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: currentUser.userId,
        isDeleted: false
      },
      include: {
        model: {
          select: {
            id: true,
            modelName: true,
            displayName: true,
            category: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // 为每个对话添加最后一条消息
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await prisma.message.findFirst({
          where: { conversationId: conv.id },
          orderBy: { createdAt: 'desc' },
          select: {
            role: true,
            content: true,
            createdAt: true
          }
        })

        return {
          ...conv,
          messageCount: conv._count.messages,
          lastMessage
        }
      })
    )

    return {
      success: true,
      data: conversationsWithLastMessage
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取对话列表失败: ${error.message}`
    })
  }
})
