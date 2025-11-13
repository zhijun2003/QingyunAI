// ==========================================
// 更新 API 密钥 API
// ==========================================
//
// PUT /api/admin/providers/:id/keys/:keyId
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { encrypt } from '@qingyun/ai-runtime'

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

    // 准备更新数据
    const updateData: any = {
      name: body.name,
      weight: body.weight,
      priority: body.priority,
      dailyLimit: body.dailyLimit,
      monthlyLimit: body.monthlyLimit,
      isActive: body.isActive
    }

    // 如果提供了新的 API 密钥，重新加密
    if (body.key) {
      const { encrypted, iv, tag } = encrypt(body.key)
      updateData.keyEncrypted = encrypted
      updateData.keyIv = `${iv}:${tag}`
    }

    // 更新 API 密钥
    const apiKey = await prisma.providerApiKey.update({
      where: { id: keyId },
      data: updateData
    })

    // 返回时不包含加密内容
    const { keyEncrypted, keyIv, ...safeApiKey } = apiKey

    return {
      success: true,
      message: 'API 密钥更新成功',
      data: safeApiKey
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `更新 API 密钥失败: ${error.message}`
    })
  }
})
