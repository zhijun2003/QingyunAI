import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 获取签到状态
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

    // 获取今天的日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 检查今天是否已签到
    const todayCheckin = await prisma.checkIn.findFirst({
      where: {
        userId: user.id,
        checkInDate: {
          gte: today,
        },
      },
    })

    // 获取最近一次签到记录
    const lastCheckin = await prisma.checkIn.findFirst({
      where: { userId: user.id },
      orderBy: { checkInDate: 'desc' },
    })

    // 计算连续签到天数
    let continuous = 0
    if (lastCheckin) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastCheckinDate = new Date(lastCheckin.checkInDate)
      lastCheckinDate.setHours(0, 0, 0, 0)

      // 如果今天已签到，使用今天的连续天数
      if (todayCheckin) {
        continuous = todayCheckin.continuous
      }
      // 如果最后一次签到是昨天，连续天数保持
      else if (lastCheckinDate.getTime() === yesterday.getTime()) {
        continuous = lastCheckin.continuous
      }
      // 否则连续天数断了
    }

    // 获取本月签到次数
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthlyCount = await prisma.checkIn.count({
      where: {
        userId: user.id,
        checkInDate: {
          gte: firstDayOfMonth,
        },
      },
    })

    // 获取总签到次数
    const totalCount = await prisma.checkIn.count({
      where: { userId: user.id },
    })

    return {
      success: true,
      data: {
        hasCheckedInToday: !!todayCheckin,
        continuous,
        monthlyCount,
        totalCount,
        lastCheckInDate: lastCheckin?.checkInDate,
        lastReward: lastCheckin?.reward,
      },
    }
  } catch (error) {
    console.error('Get check-in status failed:', error)
    return {
      success: false,
      message: '获取签到状态失败',
    }
  }
})
