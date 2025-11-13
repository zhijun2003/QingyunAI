// ==========================================
// 获取单个 Provider API
// ==========================================
//
// GET /api/admin/providers/:id
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
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            weight: true,
            priority: true,
            dailyLimit: true,
            dailyUsed: true,
            monthlyLimit: true,
            monthlyUsed: true,
            isActive: true,
            errorCount: true,
            lastUsedAt: true,
            lastResetAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [
            { priority: 'asc' },
            { createdAt: 'asc' }
          ]
        },
        models: {
          select: {
            id: true,
            modelName: true,
            displayName: true,
            groupName: true,
            category: true,
            isActive: true,
            inputPrice: true,
            outputPrice: true,
            billingType: true,
            lastSyncAt: true
          },
          orderBy: [
            { groupName: 'asc' },
            { sortOrder: 'asc' }
          ]
        }
      }
    })

    if (!provider) {
      throw createError({
        statusCode: 404,
        message: 'Provider 不存在'
      })
    }

    return {
      success: true,
      data: provider
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取 Provider 失败: ${error.message}`
    })
  }
})
