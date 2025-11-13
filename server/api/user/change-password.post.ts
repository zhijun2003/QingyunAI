// ==========================================
// 修改密码 API
// ==========================================
//
// POST /api/user/change-password
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser, verifyPassword, hashPassword } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    const body = await readBody(event)

    const { oldPassword, newPassword } = body

    if (!oldPassword || !newPassword) {
      throw createError({
        statusCode: 400,
        message: '请提供旧密码和新密码'
      })
    }

    if (newPassword.length < 6) {
      throw createError({
        statusCode: 400,
        message: '新密码长度不能少于 6 位'
      })
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: '用户不存在'
      })
    }

    // 验证旧密码
    const isOldPasswordValid = await verifyPassword(oldPassword, user.password)

    if (!isOldPasswordValid) {
      throw createError({
        statusCode: 401,
        message: '旧密码错误'
      })
    }

    // 哈希新密码
    const hashedNewPassword = await hashPassword(newPassword)

    // 更新密码
    await prisma.user.update({
      where: { id: currentUser.userId },
      data: { password: hashedNewPassword }
    })

    return {
      success: true,
      message: '密码修改成功，请使用新密码登录'
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `修改密码失败: ${error.message}`
    })
  }
})
