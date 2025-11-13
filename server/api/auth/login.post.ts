// ==========================================
// 用户登录 API
// ==========================================
//
// POST /api/auth/login
//
// 支持用户名、邮箱、手机号登录
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { verifyPassword, generateToken } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const { account, password } = body

    if (!account || !password) {
      throw createError({
        statusCode: 400,
        message: '请提供账号和密码'
      })
    }

    // 查找用户（支持用户名、邮箱、手机号）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: account },
          { email: account },
          { phone: account }
        ]
      }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        message: '账号或密码错误'
      })
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        message: '账号或密码错误'
      })
    }

    // 检查用户状态
    if (user.status === 'BANNED') {
      throw createError({
        statusCode: 403,
        message: '账号已被封禁，请联系管理员'
      })
    }

    if (user.status === 'INACTIVE') {
      throw createError({
        statusCode: 403,
        message: '账号未激活，请先激活账号'
      })
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 生成 Token
    const token = generateToken(user.id, user.role)

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = user

    return {
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `登录失败: ${error.message}`
    })
  }
})
