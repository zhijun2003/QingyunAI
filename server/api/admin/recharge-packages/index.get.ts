import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取所有充值套餐（管理员）
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

    // 获取查询参数
    const query = getQuery(event)
    const isActive = query.isActive as string | undefined

    // 构建查询条件
    const where: any = {}
    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // 查询充值套餐
    const packages = await prisma.rechargePackage.findMany({
      where,
      orderBy: [
        { sort: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // 统计信息
    const stats = {
      total: packages.length,
      active: packages.filter((p) => p.isActive).length,
      hot: packages.filter((p) => p.isHot).length,
      recommend: packages.filter((p) => p.isRecommend).length,
    }

    return {
      success: true,
      data: {
        packages,
        stats,
      },
    }
  } catch (error) {
    console.error('Get recharge packages failed:', error)
    return {
      success: false,
      message: '获取充值套餐失败',
    }
  }
})
