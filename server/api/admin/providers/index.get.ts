// ==========================================
// 获取 Provider 列表 API
// ==========================================
//
// GET /api/admin/providers
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const where: any = {}

  // 筛选条件
  if (query.type) {
    where.type = query.type
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true'
  }

  if (query.autoSync !== undefined) {
    where.autoSync = query.autoSync === 'true'
  }

  // 搜索
  if (query.search) {
    where.OR = [
      { name: { contains: query.search as string } },
      { displayName: { contains: query.search as string } }
    ]
  }

  try {
    const providers = await prisma.provider.findMany({
      where,
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            weight: true,
            priority: true,
            isActive: true,
            errorCount: true,
            dailyUsed: true,
            dailyLimit: true,
            monthlyUsed: true,
            monthlyLimit: true
          }
        },
        models: {
          select: {
            id: true,
            modelName: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // 统计信息
    const stats = providers.map(provider => ({
      ...provider,
      stats: {
        totalKeys: provider.apiKeys.length,
        activeKeys: provider.apiKeys.filter(k => k.isActive && k.errorCount < 5).length,
        totalModels: provider.models.length,
        activeModels: provider.models.filter(m => m.isActive).length
      }
    }))

    return {
      success: true,
      data: stats,
      total: stats.length
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `获取 Provider 列表失败: ${error.message}`
    })
  }
})
