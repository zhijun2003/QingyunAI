// ==========================================
// 用户认证工具
// ==========================================
//
// 负责 JWT Token 的生成和验证
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  userId: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 获取 JWT 密钥
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 环境变量未设置')
  }
  return secret
}

/**
 * 生成 JWT Token
 */
export function generateToken(userId: string, role: string = 'USER'): string {
  const payload: JwtPayload = {
    userId,
    role
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn
  })
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token 已过期，请重新登录')
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token 无效')
    } else {
      throw new Error('Token 验证失败')
    }
  }
}

/**
 * 从请求中获取 Token
 */
export function getTokenFromRequest(event: any): string | null {
  // 从 Authorization Header 获取
  const authHeader = getHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 从 Cookie 获取
  const cookies = parseCookies(event)
  if (cookies.token) {
    return cookies.token
  }

  return null
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * 从 Event 中获取当前用户信息
 */
export function getCurrentUser(event: any): JwtPayload {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      message: '未登录'
    })
  }
  return event.context.user
}

/**
 * 验证用户角色
 */
export function requireRole(user: JwtPayload, requiredRole: string) {
  if (user.role !== requiredRole && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: '权限不足'
    })
  }
}
