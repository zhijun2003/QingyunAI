// ==========================================
// 获取当前用户信息 API
// ==========================================
//
// GET /api/user/me
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)

    // 获取完整用户信息
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        nickname: true,
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
      data: user
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取用户信息失败: ${error.message}`
    })
  }
})
