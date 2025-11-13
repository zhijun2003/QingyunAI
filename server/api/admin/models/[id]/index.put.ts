// ==========================================
// 更新模型 API
// ==========================================
//
// PUT /api/admin/models/:id
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '模型 ID 不能为空'
    })
  }

  try {
    const body = await readBody(event)

    // 检查模型是否存在
    const existing = await prisma.model.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '模型不存在'
      })
    }

    // 更新模型
    const model = await prisma.model.update({
      where: { id },
      data: {
        displayName: body.displayName,
        groupName: body.groupName,
        description: body.description,
        category: body.category,
        maxTokens: body.maxTokens,
        contextWindow: body.contextWindow,
        supportStream: body.supportStream,
        supportVision: body.supportVision,
        supportFunction: body.supportFunction,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        config: body.config
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true
          }
        }
      }
    })

    return {
      success: true,
      message: '模型更新成功',
      data: model
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `更新模型失败: ${error.message}`
    })
  }
})
