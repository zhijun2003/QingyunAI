// ==========================================
// 获取当前用户信息 API (使用 nuxt-auth-utils)
// ==========================================
//
// GET /api/user/me
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  try {
    // 使用 nuxt-auth-utils 获取当前用户会话
    const session = await getUserSession(event)

    if (!session || !session.user) {
      throw createError({
        statusCode: 401,
        message: '未登录'
      })
    }

    // 获取最新的用户信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        balance: true,
        freeQuota: true,
        totalSpent: true,
        totalTokens: true,
        createdAt: true,
        lastLoginAt: true
        // 不返回密码
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: '用户不存在'
      })
    }

    return {
      success: true,
      data: {
        ...user,
        balance: user.balance.toNumber(),
        freeQuota: user.freeQuota.toNumber(),
        totalSpent: user.totalSpent.toNumber(),
        totalTokens: user.totalTokens.toNumber(),
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取用户信息失败: ${error.message}`
    })
  }
})
