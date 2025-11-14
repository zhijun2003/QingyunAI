import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 获取启用的应用列表（用户端）
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取当前用户（可选，用于权限过滤）
    const user = await getCurrentUser(event)

    // 构建查询条件
    const where: any = {
      isEnabled: true,
      isVisible: true,
    }

    // 如果用户已登录，根据角色过滤
    if (user) {
      where.OR = [
        { requiredRole: 'USER' },
        { requiredRole: user.role },
      ]
    } else {
      where.requiredRole = 'USER'
    }

    // 查询应用列表
    const applications = await prisma.application.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        key: true,
        name: true,
        displayName: true,
        description: true,
        icon: true,
        category: true,
        routePath: true,
        menuLabel: true,
        menuIcon: true,
        sortOrder: true,
        isCore: true,
        tags: true,
      },
    })

    // 分组返回
    const coreApps = applications.filter(app => app.isCore)
    const pluginApps = applications.filter(app => !app.isCore)

    return {
      success: true,
      data: {
        all: applications,
        coreApps,
        pluginApps,
      },
    }
  } catch (error) {
    console.error('Get applications failed:', error)
    return {
      success: false,
      message: '获取应用列表失败',
    }
  }
})
