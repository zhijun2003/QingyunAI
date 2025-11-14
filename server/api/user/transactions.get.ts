import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 获取当前用户的交易记录
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取当前用户
    const user = await getCurrentUser(event)
    if (!user) {
      return {
        success: false,
        message: '未登录',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Number(query.pageSize) || 20
    const type = query.type as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined

    // 构建查询条件
    const where: any = {
      userId: user.id,
    }

    if (type) {
      where.type = type
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // 查询交易记录
    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // 查询统计信息
    const stats = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // 按类型统计
    const typeStats = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId: user.id,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        stats: {
          totalAmount: stats._sum.amount || 0,
          totalCount: stats._count,
          byType: typeStats.reduce((acc, item) => {
            acc[item.type] = {
              amount: item._sum.amount || 0,
              count: item._count,
            }
            return acc
          }, {} as Record<string, { amount: any; count: number }>),
        },
      },
    }
  } catch (error) {
    console.error('Get transactions failed:', error)
    return {
      success: false,
      message: '获取交易记录失败',
    }
  }
})
