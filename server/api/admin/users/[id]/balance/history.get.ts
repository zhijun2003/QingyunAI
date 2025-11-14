import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取用户余额调整历史（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const admin = await requireRole(event, 'ADMIN')
    if (!admin) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取用户ID
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空',
      }
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Math.min(Number(query.pageSize) || 20, 100)

    // 查询余额调整记录（仅ADJUSTMENT类型）
    const where = {
      userId,
      type: 'ADJUSTMENT' as const,
    }

    const [total, records] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: {
        user,
        records,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    }
  } catch (error) {
    console.error('Get balance adjustment history failed:', error)
    return {
      success: false,
      message: '获取调整历史失败',
    }
  }
})
