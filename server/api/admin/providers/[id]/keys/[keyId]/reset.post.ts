// ==========================================
// 重置 API 密钥用量统计 API
// ==========================================
//
// POST /api/admin/providers/:id/keys/:keyId/reset
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, 'id')
  const keyId = getRouterParam(event, 'keyId')

  if (!providerId || !keyId) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 和 Key ID 不能为空'
    })
  }

  try {
    const body = await readBody(event)

    // 检查 API 密钥是否存在且属于该 Provider
    const existing = await prisma.providerApiKey.findFirst({
      where: {
        id: keyId,
        providerId
      }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'API 密钥不存在'
      })
    }

    // 准备重置数据
    const resetData: any = {
      lastResetAt: new Date()
    }

    // 根据 resetType 决定重置哪些统计
    const resetType = body.resetType || 'all' // all | daily | monthly | error

    if (resetType === 'all' || resetType === 'daily') {
      resetData.dailyUsed = 0
    }

    if (resetType === 'all' || resetType === 'monthly') {
      resetData.monthlyUsed = 0
    }

    if (resetType === 'all' || resetType === 'error') {
      resetData.errorCount = 0
    }

    // 重置统计
    const apiKey = await prisma.providerApiKey.update({
      where: { id: keyId },
      data: resetData
    })

    // 返回时不包含加密内容
    const { keyEncrypted, keyIv, ...safeApiKey } = apiKey

    return {
      success: true,
      message: `API 密钥用量统计已重置（${resetType}）`,
      data: safeApiKey
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `重置 API 密钥用量失败: ${error.message}`
    })
  }
})
