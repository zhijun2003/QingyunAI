import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 创建充值套餐（管理员）
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

    // 获取请求体
    const body = await readBody(event)
    const { name, description, amount, giveAmount, sort, isActive, isHot, isRecommend } = body

    // 验证必填字段
    if (!name || amount === undefined) {
      return {
        success: false,
        message: '套餐名称和充值金额不能为空',
      }
    }

    // 验证金额
    if (Number(amount) <= 0) {
      return {
        success: false,
        message: '充值金额必须大于0',
      }
    }

    // 创建充值套餐
    const rechargePackage = await prisma.rechargePackage.create({
      data: {
        name,
        description: description || null,
        amount,
        giveAmount: giveAmount || 0,
        sort: sort || 0,
        isActive: isActive !== false,
        isHot: isHot || false,
        isRecommend: isRecommend || false,
      },
    })

    return {
      success: true,
      data: rechargePackage,
      message: '充值套餐创建成功',
    }
  } catch (error) {
    console.error('Create recharge package failed:', error)
    return {
      success: false,
      message: '创建充值套餐失败',
    }
  }
})
