import { prisma } from '@qingyun/database'

/**
 * 获取充值套餐列表
 */
export default defineEventHandler(async () => {
  try {
    const packages = await prisma.rechargePackage.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        giveAmount: true,
        sortOrder: true,
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
