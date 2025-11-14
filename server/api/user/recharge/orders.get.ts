import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 查询充值订单列表
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证用户登录
    const user = await getCurrentUser(event)
    if (!user) {
      return {
        success: false,
        message: '请先登录',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Math.min(Number(query.pageSize) || 20, 100)
    const status = query.status as string | undefined

    // 构建查询条件
    const where: any = { userId: user.id }
    if (status) {
      where.status = status
    }

    // 查询总数和订单列表
    const [total, orders] = await Promise.all([
      prisma.rechargeOrder.count({ where }),
      prisma.rechargeOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          package: {
            select: {
              name: true,
              isHot: true,
              isRecommend: true,
            },
          },
        },
      }),
    ])

    // 计算统计信息
    const stats = {
      totalOrders: total,
      paidOrders: await prisma.rechargeOrder.count({
        where: { userId: user.id, status: 'PAID' },
      }),
      totalAmount: await prisma.rechargeOrder.aggregate({
        where: { userId: user.id, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
    }

    return {
      success: true,
      data: {
        orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        stats,
      },
    }
  } catch (error) {
    console.error('Get recharge orders failed:', error)
    return {
      success: false,
      message: '查询订单失败',
    }
  }
})
