// ==========================================
// 认证中间件
// ==========================================
//
// 验证用户登录状态，将用户信息注入到 event.context.user
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { verifyToken, getTokenFromRequest } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // 跳过公开路由
  const publicRoutes = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/health'
  ]

  const path = event.node.req.url || ''

  // 如果是公开路由，直接放行
  if (publicRoutes.some(route => path.startsWith(route))) {
    return
  }

  // 获取 Token
  const token = getTokenFromRequest(event)

  if (!token) {
    // 如果不是必须登录的路由，放行（部分路由可选登录）
    if (!path.startsWith('/api/user') && !path.startsWith('/api/chat') && !path.startsWith('/api/admin')) {
      return
    }

    throw createError({
      statusCode: 401,
      message: '未登录，请先登录'
    })
  }

  try {
    // 验证 Token
    const user = verifyToken(token)

    // 将用户信息注入到 context
    event.context.user = user
  } catch (error: any) {
    throw createError({
      statusCode: 401,
      message: error.message || 'Token 验证失败'
    })
  }
})
