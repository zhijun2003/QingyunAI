import { prisma } from '@qingyun/database'
import { verifyAlipayCallback } from '~/server/utils/payment'

/**
 * 支付宝支付回调
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取回调参数
    const body = await readBody(event)

    // 验证签名
    const isValid = await verifyAlipayCallback(body)
    if (!isValid) {
      console.error('Alipay callback signature verification failed')
      return 'fail'
    }

    const {
      out_trade_no: orderNo,
      trade_status: tradeStatus,
      trade_no: tradeNo,
      total_amount: totalAmount,
    } = body

    // 查询订单
    const order = await prisma.rechargeOrder.findUnique({
      where: { orderNo },
    })

    if (!order) {
      console.error(`Order not found: ${orderNo}`)
      return 'fail'
    }

    // 检查订单是否已处理
    if (order.status === 'PAID') {
      return 'success'
    }

    // 只有支付成功才处理
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      console.log(`Alipay trade status not success: ${tradeStatus}`)
      return 'success'
    }

    // 验证金额
    if (Number(totalAmount) !== Number(order.amount)) {
      console.error(`Amount mismatch: ${totalAmount} vs ${order.amount}`)
      return 'fail'
    }

    // 开始事务：更新订单状态、增加用户余额、创建交易记录
    await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      await tx.rechargeOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentOrderId: tradeNo,
          paidAt: new Date(),
          notifyData: body,
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
            paymentMethod: 'alipay',
            tradeNo,
          },
        },
      })
    })

    console.log(`Alipay payment success: ${orderNo}`)
    return 'success'
  } catch (error) {
    console.error('Alipay notify callback failed:', error)
    return 'fail'
  }
})
