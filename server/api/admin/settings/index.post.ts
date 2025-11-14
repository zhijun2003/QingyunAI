// ==========================================
// 创建系统配置
// ==========================================
//
// POST /api/admin/settings
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

    // 获取请求体
    const body = await readBody(event)
    const { key, value, description, group, valueType } = body

    // 验证必填字段
    if (!key || value === undefined) {
      throw createError({
        statusCode: 400,
        message: 'key 和 value 是必填字段',
      })
    }

    // 检查配置是否已存在
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key },
    })

    if (existingConfig) {
      throw createError({
        statusCode: 400,
        message: '配置 key 已存在',
      })
    }

    // 创建配置
    const config = await prisma.systemConfig.create({
      data: {
        key,
        value: String(value),
        description,
        group: group || 'general',
        valueType: valueType || 'string',
      },
    })

    return {
      success: true,
      message: '配置创建成功',
      data: config,
    }
  } catch (error: any) {
    console.error('Create setting failed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '创建配置失败',
    })
  }
})
