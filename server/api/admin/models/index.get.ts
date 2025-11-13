// ==========================================
// 获取模型列表 API
// ==========================================
//
// GET /api/admin/models
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)

    // 构建查询条件
    const where: any = {}

    // 按 Provider 筛选
    if (query.providerId) {
      where.providerId = query.providerId as string
    }

    // 按 Provider 类型筛选
    if (query.providerType) {
      where.provider = {
        type: query.providerType as string
      }
    }

    // 按模型类别筛选
    if (query.category) {
      where.category = query.category as string
    }

    // 按分组筛选
    if (query.groupName) {
      where.groupName = query.groupName as string
    }

    // 按状态筛选
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true'
    }

    // 搜索（模型名称或显示名称）
    if (query.search) {
      where.OR = [
        { modelName: { contains: query.search as string } },
        { displayName: { contains: query.search as string } }
      ]
    }

    // 获取模型列表
    const models = await prisma.model.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            icon: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { groupName: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // 计算统计信息
    const stats = {
      total: models.length,
      active: models.filter(m => m.isActive).length,
      byCategory: models.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byGroup: models.reduce((acc, m) => {
        acc[m.groupName] = (acc[m.groupName] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // 按分组整理数据
    const groupedModels = models.reduce((acc, model) => {
      const group = model.groupName
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(model)
      return acc
    }, {} as Record<string, typeof models>)

    return {
      success: true,
      data: {
        models,
        grouped: groupedModels
      },
      stats
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `获取模型列表失败: ${error.message}`
    })
  }
})
