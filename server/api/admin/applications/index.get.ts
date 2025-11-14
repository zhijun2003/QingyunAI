import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取所有应用（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const user = await requireRole(event, 'ADMIN')
    if (!user) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const category = query.category as string | undefined

    // 构建查询条件
    const where: any = {}
    if (category && category !== 'ALL') {
      where.category = category
    }

    // 查询应用列表
    const applications = await prisma.application.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // 统计信息
    const stats = {
      total: applications.length,
      enabled: applications.filter(app => app.isEnabled).length,
      core: applications.filter(app => app.isCore).length,
      byCategory: {} as Record<string, number>,
    }

    // 按类别统计
    applications.forEach((app) => {
      const cat = app.category
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1
    })

    return {
      success: true,
      data: {
        applications,
        stats,
      },
    }
  } catch (error) {
    console.error('Get admin applications failed:', error)
    return {
      success: false,
      message: '获取应用列表失败',
    }
  }
})
