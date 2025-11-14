import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'
import { getSystemConfig } from '~/server/utils/config'

/**
 * 生成订单号
 * 格式：R + 时间戳(13位) + 用户ID后6位 + 随机数(4位)
 */
function generateOrderNo(userId: string): string {
  const timestamp = Date.now()
  const userSuffix = userId.slice(-6)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `R${timestamp}${userSuffix}${random}`
}

/**
 * 创建充值订单
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

    // 加载充值和支付配置
    const rechargeConfig = await getSystemConfig('recharge')
    const paymentConfig = await getSystemConfig('payment')

    const minAmount = Number(rechargeConfig.min_amount || 1)
    const customEnabled = rechargeConfig.custom_enabled === 'true'

    // 获取请求体
    const body = await readBody(event)
    const { packageId, paymentMethod } = body

    // 验证支付方式
    if (!paymentMethod || !['alipay', 'wechat'].includes(paymentMethod)) {
      return {
        success: false,
        message: '无效的支付方式',
      }
    }

    // 检查支付方式是否启用
    const paymentEnabled = paymentConfig[`${paymentMethod}.enabled`] === 'true'
    if (!paymentEnabled) {
      return {
        success: false,
        message: `${paymentMethod === 'alipay' ? '支付宝' : '微信'}支付暂未开启`,
      }
    }

    // 获取充值套餐信息
    let amount = 0
    let giveAmount = 0
    let totalAmount = 0

    if (packageId) {
      const rechargePackage = await prisma.rechargePackage.findUnique({
        where: { id: packageId, isActive: true },
      })

      if (!rechargePackage) {
        return {
          success: false,
          message: '充值套餐不存在或已下架',
        }
      }

      amount = Number(rechargePackage.amount)
      giveAmount = Number(rechargePackage.giveAmount)
      totalAmount = amount + giveAmount
    } else {
      // 自定义金额充值
      if (!customEnabled) {
        return {
          success: false,
          message: '暂不支持自定义金额充值',
        }
      }

      const customAmount = Number(body.amount)
      if (!customAmount || customAmount <= 0) {
        return {
          success: false,
          message: '请输入有效的充值金额',
        }
      }
      if (customAmount < minAmount) {
        return {
          success: false,
          message: `最低充值金额为${minAmount}元`,
        }
      }

      amount = customAmount
      giveAmount = 0
      totalAmount = amount
    }

    // 生成订单号
    const orderNo = generateOrderNo(user.id)

    // 创建订单（30分钟后过期）
    const expireAt = new Date(Date.now() + 30 * 60 * 1000)

    const order = await prisma.rechargeOrder.create({
      data: {
        userId: user.id,
        packageId: packageId || null,
        orderNo,
        amount,
        giveAmount,
        totalAmount,
        paymentMethod,
        expireAt,
      },
    })

    return {
      success: true,
      data: {
        id: order.id,
        orderNo: order.orderNo,
        amount: order.amount,
        giveAmount: order.giveAmount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        expireAt: order.expireAt,
      },
      message: '订单创建成功',
    }
  } catch (error) {
    console.error('Create recharge order failed:', error)
    return {
      success: false,
      message: '创建订单失败',
    }
  }
})
