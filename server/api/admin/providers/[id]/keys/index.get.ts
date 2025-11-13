// ==========================================
// 获取 API 密钥列表 API
// ==========================================
//
// GET /api/admin/providers/:id/keys
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, 'id')

  if (!providerId) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    // 检查 Provider 是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      throw createError({
        statusCode: 404,
        message: 'Provider 不存在'
      })
    }

    // 获取查询参数
    const query = getQuery(event)

    const where: any = { providerId }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true'
    }

    // 获取 API 密钥列表
    const apiKeys = await prisma.providerApiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        weight: true,
        priority: true,
        dailyLimit: true,
        dailyUsed: true,
        monthlyLimit: true,
        monthlyUsed: true,
        isActive: true,
        errorCount: true,
        lastUsedAt: true,
        lastResetAt: true,
        createdAt: true,
        updatedAt: true
        // 不包含 keyEncrypted 和 keyIv
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // 计算每个密钥的状态
    const keysWithStatus = apiKeys.map(key => {
      const isOverDailyLimit = key.dailyLimit ? key.dailyUsed >= key.dailyLimit : false
      const isOverMonthlyLimit = key.monthlyLimit ? key.monthlyUsed >= key.monthlyLimit : false
      const hasErrors = key.errorCount >= 5

      let status = 'normal'
      if (!key.isActive) status = 'disabled'
      else if (hasErrors) status = 'error'
      else if (isOverDailyLimit) status = 'daily_limit'
      else if (isOverMonthlyLimit) status = 'monthly_limit'

      return {
        ...key,
        status,
        usageRate: {
          daily: key.dailyLimit ? (key.dailyUsed / key.dailyLimit * 100).toFixed(2) : null,
          monthly: key.monthlyLimit ? (key.monthlyUsed / key.monthlyLimit * 100).toFixed(2) : null
        }
      }
    })

    // 统计信息
    const stats = {
      total: apiKeys.length,
      active: apiKeys.filter(k => k.isActive).length,
      available: keysWithStatus.filter(k => k.status === 'normal').length,
      error: keysWithStatus.filter(k => k.status === 'error').length
    }

    return {
      success: true,
      data: keysWithStatus,
      stats
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取 API 密钥列表失败: ${error.message}`
    })
  }
})
