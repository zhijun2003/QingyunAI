import { prisma } from '@qingyun/database'
import { verifyWechatCallback } from '~/server/utils/payment'

/**
 * 微信支付回调
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取回调头部信息
    const headers = getRequestHeaders(event)
    const signature = headers['wechatpay-signature'] as string
    const timestamp = headers['wechatpay-timestamp'] as string
    const nonce = headers['wechatpay-nonce'] as string

    // 获取原始请求体
    const body = await readRawBody(event)

    if (!body || !signature || !timestamp || !nonce) {
      console.error('WeChat Pay callback missing required parameters')
      return {
        code: 'FAIL',
        message: '缺少必要参数',
      }
    }

    // 验证签名
    const isValid = await verifyWechatCallback(signature, timestamp, nonce, body)
    if (!isValid) {
      console.error('WeChat Pay callback signature verification failed')
      return {
        code: 'FAIL',
        message: '签名验证失败',
      }
    }

    // 解析回调数据
    const data = JSON.parse(body)
    const { resource } = data

    // 解密资源数据（微信支付会对resource进行加密）
    // 这里简化处理，实际应该解密
    const {
      out_trade_no: orderNo,
      transaction_id: transactionId,
      trade_state: tradeState,
      amount,
    } = resource

    // 查询订单
    const order = await prisma.rechargeOrder.findUnique({
      where: { orderNo },
    })

    if (!order) {
      console.error(`Order not found: ${orderNo}`)
      return {
        code: 'FAIL',
        message: '订单不存在',
      }
    }

    // 检查订单是否已处理
    if (order.status === 'PAID') {
      return {
        code: 'SUCCESS',
        message: '成功',
      }
    }

    // 只有支付成功才处理
    if (tradeState !== 'SUCCESS') {
      console.log(`WeChat Pay trade state not success: ${tradeState}`)
      return {
        code: 'SUCCESS',
        message: '成功',
      }
    }

    // 验证金额（微信支付金额单位是分）
    const totalAmountYuan = amount.total / 100
    if (totalAmountYuan !== Number(order.amount)) {
      console.error(`Amount mismatch: ${totalAmountYuan} vs ${order.amount}`)
      return {
        code: 'FAIL',
        message: '金额不匹配',
      }
    }

    // 开始事务：更新订单状态、增加用户余额、创建交易记录
    await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      await tx.rechargeOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentOrderId: transactionId,
          paidAt: new Date(),
          notifyData: data,
        },
      })

      // 2. 获取用户信息
      const user = await tx.user.findUnique({
        where: { id: order.userId },
      })

      if (!user) {
        throw new Error(`User not found: ${order.userId}`)
      }

      // 计算实际到账金额（充值金额 + 赠送金额），单位：分
      const totalAmountCents = Math.round((Number(order.amount) + Number(order.giveAmount)) * 100)

      // 3. 增加用户余额（单位：分）
      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: {
          balance: {
            increment: totalAmountCents,
          },
        },
      })

      // 4. 创建交易记录
      await tx.transaction.create({
        data: {
          userId: order.userId,
          type: 'RECHARGE',
          amount: totalAmountCents,
          balanceBefore: Number(user.balance),
          balanceAfter: Number(updatedUser.balance),
          description: `充值 ${order.amount}元${Number(order.giveAmount) > 0 ? `（赠送${order.giveAmount}元）` : ''}`,
          metadata: {
            orderNo: order.orderNo,
            paymentMethod: 'wechat',
            transactionId,
          },
        },
      })
    })

    console.log(`WeChat Pay payment success: ${orderNo}`)
    return {
      code: 'SUCCESS',
      message: '成功',
    }
  } catch (error) {
    console.error('WeChat Pay notify callback failed:', error)
    return {
      code: 'FAIL',
      message: '处理失败',
    }
  }
})
