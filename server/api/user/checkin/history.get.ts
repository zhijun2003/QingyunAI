import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 获取签到历史
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

    // 获取查询参数
    const query = getQuery(event)
    const year = Number(query.year) || new Date().getFullYear()
    const month = Number(query.month) || new Date().getMonth() + 1

    // 构建日期范围
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    // 查询签到历史
    const checkins = await prisma.checkIn.findMany({
      where: {
        userId: user.id,
        checkInDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { checkInDate: 'desc' },
    })

    // 计算统计信息
    const stats = {
      count: checkins.length,
      totalReward: checkins.reduce((sum, item) => sum + Number(item.reward), 0),
      maxContinuous: checkins.length > 0 ? Math.max(...checkins.map(item => item.continuous)) : 0,
    }

    return {
      success: true,
      data: {
        year,
        month,
        checkins: checkins.map(item => ({
          date: item.checkInDate,
          continuous: item.continuous,
          reward: item.reward,
        })),
        stats,
      },
    }
  } catch (error) {
    console.error('Get check-in history failed:', error)
    return {
      success: false,
      message: '获取签到历史失败',
    }
  }
})
