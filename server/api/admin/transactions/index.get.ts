import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取所有交易记录（管理员）
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
    const page = Number(query.page) || 1
    const pageSize = Number(query.pageSize) || 20
    const type = query.type as string | undefined
    const userId = query.userId as string | undefined
    const paymentMethod = query.paymentMethod as string | undefined
    const search = query.search as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined

    // 构建查询条件
    const where: any = {}

    if (type) {
      where.type = type
    }

    if (userId) {
      where.userId = userId
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { paymentOrderId: { contains: search } },
        {
          user: {
            OR: [
              { username: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { nickname: { contains: search } },
            ],
          },
        },
      ]
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
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // 查询统计信息
    const stats = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // 按类型统计
    const typeStats = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // 按支付方式统计
    const paymentMethodStats = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        ...where,
        paymentMethod: { not: null },
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
          byPaymentMethod: paymentMethodStats.reduce((acc, item) => {
            if (item.paymentMethod) {
              acc[item.paymentMethod] = {
                amount: item._sum.amount || 0,
                count: item._count,
              }
            }
            return acc
          }, {} as Record<string, { amount: any; count: number }>),
        },
      },
    }
  } catch (error) {
    console.error('Get admin transactions failed:', error)
    return {
      success: false,
      message: '获取交易记录失败',
    }
  }
})
