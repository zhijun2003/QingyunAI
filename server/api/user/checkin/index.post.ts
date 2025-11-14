import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'
import { getSystemConfig } from '~/server/utils/config'

/**
 * 计算签到奖励（分）
 * 使用数据库配置动态计算奖励
 */
function calculateReward(
  continuous: number,
  baseReward: number,
  bonus3: number,
  bonus7: number,
  bonus30: number
): number {
  let reward = baseReward

  if (continuous >= 30) {
    reward += bonus30
  } else if (continuous >= 7) {
    reward += bonus7
  } else if (continuous >= 3) {
    reward += bonus3
  }

  return reward
}

/**
 * 每日签到
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

    // 加载签到配置
    const config = await getSystemConfig('checkin')
    const enabled = config.enabled === 'true'

    if (!enabled) {
      return {
        success: false,
        message: '签到功能暂未开启',
      }
    }

    const baseReward = Number(config.base_reward || 50)
    const bonus3 = Number(config.continuous_3_bonus || 10)
    const bonus7 = Number(config.continuous_7_bonus || 50)
    const bonus30 = Number(config.continuous_30_bonus || 200)

    // 获取今天的日期（只保留年月日）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 检查今天是否已签到
    const existingCheckin = await prisma.checkIn.findFirst({
      where: {
        userId: user.id,
        checkInDate: {
          gte: today,
        },
      },
    })

    if (existingCheckin) {
      return {
        success: false,
        message: '今日已签到',
      }
    }

    // 获取最近一次签到记录
    const lastCheckin = await prisma.checkIn.findFirst({
      where: { userId: user.id },
      orderBy: { checkInDate: 'desc' },
    })

    // 计算连续签到天数
    let continuous = 1
    if (lastCheckin) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastCheckinDate = new Date(lastCheckin.checkInDate)
      lastCheckinDate.setHours(0, 0, 0, 0)

      // 如果最后一次签到是昨天，则连续天数+1
      if (lastCheckinDate.getTime() === yesterday.getTime()) {
        continuous = lastCheckin.continuous + 1
      }
      // 否则重置为1
    }

    // 计算奖励（分）
    const rewardCents = calculateReward(continuous, baseReward, bonus3, bonus7, bonus30)
    const rewardYuan = rewardCents / 100

    // 开始事务：创建签到记录、更新余额、创建交易记录
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建签到记录
      const checkin = await tx.checkIn.create({
        data: {
          userId: user.id,
          checkInDate: today,
          continuous,
          reward: rewardYuan,
        },
      })

      // 2. 更新用户余额（以分为单位）
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            increment: rewardCents, // 修复：使用分而不是元
          },
        },
      })

      // 3. 创建交易记录（以分为单位）
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'GIFT_SIGNIN',
          amount: rewardCents, // 修复：使用分
          balanceBefore: Number(user.balance),
          balanceAfter: Number(updatedUser.balance),
          description: `签到奖励（连续${continuous}天）`,
        },
      })

      return { checkin, newBalance: updatedUser.balance }
    })

    return {
      success: true,
      data: {
        continuous,
        reward: rewardYuan,
        newBalance: result.newBalance,
        checkInDate: result.checkin.checkInDate,
      },
      message: `签到成功！获得${rewardYuan}元奖励`,
    }
  } catch (error) {
    console.error('Check-in failed:', error)
    return {
      success: false,
      message: '签到失败',
    }
  }
})
