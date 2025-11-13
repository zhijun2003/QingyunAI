// ==========================================
// 创建对话 API
// ==========================================
//
// POST /api/chat/conversations
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    const body = await readBody(event)

    const { title, modelId } = body

    // 验证模型是否存在
    if (modelId) {
      const model = await prisma.model.findUnique({
        where: { id: modelId }
      })

      if (!model) {
        throw createError({
          statusCode: 400,
          message: '模型不存在'
        })
      }

      if (!model.isActive) {
        throw createError({
          statusCode: 400,
          message: '模型已禁用'
        })
      }
    }

    // 创建对话
    const conversation = await prisma.conversation.create({
      data: {
        userId: currentUser.userId,
        title: title || '新对话',
        modelId
      }
    })

    return {
      success: true,
      message: '对话创建成功',
      data: conversation
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `创建对话失败: ${error.message}`
    })
  }
})
