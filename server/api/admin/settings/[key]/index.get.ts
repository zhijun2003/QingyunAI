// ==========================================
// 获取单个系统配置
// ==========================================
//
// GET /api/admin/settings/:key
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const currentUser = await getCurrentUser(event)
    if (!currentUser || currentUser.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        message: '需要管理员权限',
      })
    }

    // 获取配置 key
    const key = getRouterParam(event, 'key')
    if (!key) {
      throw createError({
        statusCode: 400,
        message: '配置 key 不能为空',
      })
    }

    // 查询配置
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    })

    if (!config) {
      throw createError({
        statusCode: 404,
        message: '配置不存在',
      })
    }

    return {
      success: true,
      data: config,
    }
  } catch (error: any) {
    console.error('Get setting failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '获取配置失败',
    })
  }
})
