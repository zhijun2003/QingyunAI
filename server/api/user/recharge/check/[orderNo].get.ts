import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 检查充值订单状态
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

    // 获取订单号
    const orderNo = getRouterParam(event, 'orderNo')
    if (!orderNo) {
      return {
        success: false,
        message: '订单号不能为空',
      }
    }

    // 查询订单
    const order = await prisma.rechargeOrder.findUnique({
      where: { orderNo },
      include: {
        package: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!order) {
      return {
        success: false,
        message: '订单不存在',
      }
    }

    // 验证订单所有权
    if (order.userId !== user.id) {
      return {
        success: false,
        message: '无权查看此订单',
      }
    }

    // 检查订单是否过期
    if (order.status === 'PENDING' && order.expireAt && new Date() > order.expireAt) {
      // 更新订单状态为已过期
      await prisma.rechargeOrder.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      })
      order.status = 'EXPIRED' as any
    }

    return {
      success: true,
      data: {
        id: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        giveAmount: order.giveAmount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        expireAt: order.expireAt,
        packageName: order.package?.name,
      },
    }
  } catch (error) {
    console.error('Check order status failed:', error)
    return {
      success: false,
      message: '查询订单失败',
    }
  }
})
