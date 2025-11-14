import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 调整用户余额（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const admin = await requireRole(event, 'ADMIN')
    if (!admin) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取用户ID
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      return {
        success: false,
        message: '用户ID不能为空',
      }
    }

    // 获取请求体
    const body = await readBody(event)
    const { amount, reason } = body

    // 验证参数
    if (amount === undefined || amount === null || amount === 0) {
      return {
        success: false,
        message: '调整金额不能为0',
      }
    }

    const adjustAmount = Number(amount)
    if (isNaN(adjustAmount)) {
      return {
        success: false,
        message: '无效的金额',
      }
    }

    if (!reason || reason.trim() === '') {
      return {
        success: false,
        message: '请输入调整原因',
      }
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      }
    }

    // 如果是减少余额，检查余额是否充足
    if (adjustAmount < 0 && Number(user.balance) + adjustAmount < 0) {
      return {
        success: false,
        message: `余额不足，当前余额：${Number(user.balance) / 100}元`,
      }
    }

    const balanceBefore = Number(user.balance)
    const balanceAfter = balanceBefore + adjustAmount

    // 开始事务：更新余额、创建交易记录
    await prisma.$transaction(async (tx) => {
      // 1. 更新用户余额
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: adjustAmount,
          },
        },
      })

      // 2. 创建交易记录
      await tx.transaction.create({
        data: {
          userId,
          type: 'ADJUSTMENT',
          amount: adjustAmount,
          balanceBefore,
          balanceAfter,
          description: `管理员调整余额：${reason}`,
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
          },
        },
      })
    })

    return {
      success: true,
      data: {
        balanceBefore,
        balanceAfter,
        adjustAmount,
      },
      message: `余额调整成功，${adjustAmount > 0 ? '增加' : '减少'}${Math.abs(adjustAmount) / 100}元`,
    }
  } catch (error) {
    console.error('Adjust user balance failed:', error)
    return {
      success: false,
      message: '调整余额失败',
    }
  }
})
