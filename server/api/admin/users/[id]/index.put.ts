// ==========================================
// 更新用户信息 API（管理员）
// ==========================================
//
// PUT /api/admin/users/:id
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser, requireRole } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    requireRole(currentUser, 'ADMIN')

    const userId = getRouterParam(event, 'id')

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: '用户 ID 不能为空'
      })
    }

    const body = await readBody(event)

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        message: '用户不存在'
      })
    }

    // 更新用户信息
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: body.role,
        status: body.status,
        balance: body.balance,
        freeQuota: body.freeQuota,
        nickname: body.nickname,
        email: body.email,
        phone: body.phone
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        balance: true,
        freeQuota: true,
        totalSpent: true,
        totalTokens: true,
        createdAt: true,
        lastLoginAt: true
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
