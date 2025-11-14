import { prisma } from '@qingyun/database'

/**
 * 获取可用充值套餐（用户端）
 */
export default defineEventHandler(async (event) => {
  try {
    // 查询所有激活的充值套餐
    const packages = await prisma.rechargePackage.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sort: 'asc' },
        { amount: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        giveAmount: true,
        isHot: true,
        isRecommend: true,
      },
    })

    return {
      success: true,
      data: packages,
    }
  } catch (error) {
    console.error('Get recharge packages failed:', error)
    return {
      success: false,
      message: '获取充值套餐失败',
    }
  }
})
