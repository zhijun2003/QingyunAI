// ==========================================
// 用户注册 API (使用 nuxt-auth-utils)
// ==========================================
//
// POST /api/auth/register
//
// 支持手机号、邮箱、用户名注册
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { hashPassword } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // 验证必填字段
    const { username, password, email, phone, displayName } = body

    if (!password || password.length < 6) {
      throw createError({
        statusCode: 400,
        message: '密码长度不能少于 6 位'
      })
    }

    // 至少提供一种登录方式
    if (!username && !email && !phone) {
      throw createError({
        statusCode: 400,
        message: '请提供用户名、邮箱或手机号中的至少一种'
      })
    }

    // 检查用户名是否重复
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: '用户名已被使用'
        })
      }
    }

    // 检查邮箱是否重复
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email }
      })

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: '邮箱已被注册'
        })
      }
    }

    // 检查手机号是否重复
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: { phone }
      })

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: '手机号已被注册'
        })
      }
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        phone,
        displayName: displayName || username || '新用户',
        role: 'USER',
        balance: 0,
        freeQuota: 100000 // 新用户赠送 10 万 Tokens
      }
    })

    // 使用 nuxt-auth-utils 设置用户会话
    await setUserSession(event, {
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        balance: user.balance.toNumber(),
        freeQuota: user.freeQuota.toNumber(),
      }
    })

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = user

    return {
      success: true,
      message: '注册成功',
      data: {
        user: {
          ...userWithoutPassword,
          balance: user.balance.toNumber(),
          freeQuota: user.freeQuota.toNumber(),
        }
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `注册失败: ${error.message}`
    })
  }
})
