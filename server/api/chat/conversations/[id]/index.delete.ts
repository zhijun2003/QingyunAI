// ==========================================
// 删除对话 API
// ==========================================
//
// DELETE /api/chat/conversations/:id
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
        message: '无权删除此对话'
      })
    }

    // 软删除对话（标记为已删除）
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isDeleted: true }
    })

    return {
      success: true,
      message: '对话已删除'
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `删除对话失败: ${error.message}`
    })
  }
})
