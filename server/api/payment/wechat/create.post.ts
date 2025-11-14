import { prisma } from '@qingyun/database'
import { createWechatOrder } from '~/server/utils/payment'

/**
 * 创建微信支付
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

    // 获取客户端IP
    const headers = getRequestHeaders(event)
    const clientIp = headers['x-forwarded-for']?.split(',')[0].trim()
      || headers['x-real-ip']
      || '127.0.0.1'

    // 获取请求的基础URL
    const protocol = headers['x-forwarded-proto'] || 'http'
    const host = headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    // 创建微信支付订单
    const result = await createWechatOrder({
      orderNo: order.orderNo,
      description: `清云AI充值 - ${order.amount}元`,
      totalAmount: Number(order.amount),
      channel: channel as 'pc' | 'mobile',
      notifyUrl: `${baseUrl}/api/payment/wechat/notify`,
      clientIp,
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

    // 根据渠道返回不同的支付信息
    let paymentData
    if (channel === 'pc') {
      // PC端返回二维码URL
      paymentData = {
        qrCode: result.data.code_url,
        orderNo: order.orderNo,
        amount: order.amount,
      }
    } else {
      // 移动端返回H5跳转URL
      paymentData = {
        h5Url: result.data.h5_url,
        orderNo: order.orderNo,
        amount: order.amount,
      }
    }

    return {
      success: true,
      data: paymentData,
    }
  } catch (error) {
    console.error('Create WeChat Pay payment failed:', error)
    return {
      success: false,
      message: '创建支付失败',
    }
  }
})
