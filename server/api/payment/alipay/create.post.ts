import { prisma } from '@qingyun/database'
import { createAlipayOrder } from '~/server/utils/payment'

/**
 * 创建支付宝支付
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取订单号
    const body = await readBody(event)
    const { orderNo, channel = 'pc' } = body

    if (!orderNo) {
      return {
        success: false,
        message: '订单号不能为空',
      }
    }

    // 查询订单
    const order = await prisma.rechargeOrder.findUnique({
      where: { orderNo },
    })

    if (!order) {
      return {
        success: false,
        message: '订单不存在',
      }
    }

    if (order.status !== 'PENDING') {
      return {
        success: false,
        message: '订单状态无效',
      }
    }

    // 检查订单是否过期
    if (order.expireAt && new Date(order.expireAt) < new Date()) {
      // 更新订单状态为已过期
      await prisma.rechargeOrder.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      })

      return {
        success: false,
        message: '订单已过期',
      }
    }

    // 获取请求的基础URL
    const headers = getRequestHeaders(event)
    const protocol = headers['x-forwarded-proto'] || 'http'
    const host = headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    // 创建支付宝订单
    const result = await createAlipayOrder({
      orderNo: order.orderNo,
      subject: `清云AI充值 - ${order.amount}元`,
      totalAmount: Number(order.amount),
      channel: channel as 'pc' | 'mobile',
      returnUrl: `${baseUrl}/recharge/result?orderNo=${order.orderNo}`,
      notifyUrl: `${baseUrl}/api/payment/alipay/notify`,
    })

    if (!result.success) {
      return {
        success: false,
        message: result.message || '创建支付失败',
      }
    }

    // 更新订单的支付渠道
    await prisma.rechargeOrder.update({
      where: { id: order.id },
      data: { paymentChannel: channel },
    })

    return {
      success: true,
      data: {
        paymentUrl: result.data, // 支付宝返回的支付URL或表单
        orderNo: order.orderNo,
        amount: order.amount,
      },
    }
  } catch (error) {
    console.error('Create Alipay payment failed:', error)
    return {
      success: false,
      message: '创建支付失败',
    }
  }
})
