// ==========================================
// 获取所有系统配置（按分组）
// ==========================================
//
// GET /api/admin/settings
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const currentUser = await getCurrentUser(event)
    if (!currentUser || currentUser.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        message: '需要管理员权限',
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const group = query.group as string | undefined

    // 查询配置
    const configs = await prisma.systemConfig.findMany({
      where: group ? { group } : undefined,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })

    // 按分组组织数据
    const groupedConfigs = configs.reduce(
      (acc, config) => {
        if (!acc[config.group]) {
          acc[config.group] = []
        }
        acc[config.group].push({
          id: config.id,
          key: config.key,
          value: config.value,
          description: config.description,
          valueType: config.valueType,
          updatedAt: config.updatedAt,
        })
        return acc
      },
      {} as Record<string, any[]>
    )

    return {
      success: true,
      data: {
        configs,
        grouped: groupedConfigs,
      },
    }
  } catch (error: any) {
    console.error('Get settings failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取配置失败',
    })
  }
})
