// ==========================================
// 更新用户信息 API
// ==========================================
//
// PUT /api/user/me
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    const body = await readBody(event)

    const { nickname, avatar, bio, email, phone } = body

    // 如果要更新邮箱，检查是否已被使用
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: currentUser.userId }
        }
      })

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: '该邮箱已被其他用户使用'
        })
      }
    }

    // 如果要更新手机号，检查是否已被使用
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: currentUser.userId }
        }
      })

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: '该手机号已被其他用户使用'
        })
      }
    }

    // 更新用户信息
    const user = await prisma.user.update({
      where: { id: currentUser.userId },
      data: {
        nickname,
        avatar,
        bio,
        email,
        phone
      },
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
        createdAt: true
      }
    })

    return {
      success: true,
      message: '用户信息更新成功',
      data: user
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `更新用户信息失败: ${error.message}`
    })
  }
})
