// ==========================================
// 删除 Provider API
// ==========================================
//
// DELETE /api/admin/providers/:id
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    // 检查 Provider 是否存在
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        apiKeys: true,
        models: true
      }
    })

    if (!provider) {
      throw createError({
        statusCode: 404,
        message: 'Provider 不存在'
      })
    }

    // 检查是否有关联的对话记录使用了该 Provider 的模型
    const usedInConversations = await prisma.message.findFirst({
      where: {
        modelId: {
          in: provider.models.map(m => m.id)
        }
      }
    })

    if (usedInConversations) {
      throw createError({
        statusCode: 400,
        message: '该 Provider 的模型已被使用，无法删除。建议禁用而非删除。'
      })
    }

    // 记录要删除的统计信息
    const stats = {
      apiKeys: provider.apiKeys.length,
      models: provider.models.length
    }

    // 级联删除（Prisma schema 中已配置 onDelete: Cascade）
    // 会自动删除关联的 apiKeys 和 models
    await prisma.provider.delete({
      where: { id }
    })

    return {
      success: true,
      message: `Provider "${provider.displayName}" 已删除`,
      data: {
        deletedProvider: {
          id: provider.id,
          name: provider.name,
          displayName: provider.displayName
        },
        deletedStats: stats
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `删除 Provider 失败: ${error.message}`
    })
  }
})
