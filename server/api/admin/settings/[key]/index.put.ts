// ==========================================
// 更新系统配置
// ==========================================
//
// PUT /api/admin/settings/:key
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

    // 获取请求体
    const body = await readBody(event)
    const { value, description } = body

    if (value === undefined) {
      throw createError({
        statusCode: 400,
        message: '配置值不能为空',
      })
    }

    // 检查配置是否存在
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key },
    })

    if (!existingConfig) {
      throw createError({
        statusCode: 404,
        message: '配置不存在',
      })
    }

    // 更新配置
    const config = await prisma.systemConfig.update({
      where: { key },
      data: {
        value: String(value),
        description: description || existingConfig.description,
      },
    })

    return {
      success: true,
      message: '配置更新成功',
      data: config,
    }
  } catch (error: any) {
    console.error('Update setting failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '更新配置失败',
    })
  }
})
