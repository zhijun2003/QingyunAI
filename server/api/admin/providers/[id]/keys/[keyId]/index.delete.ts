// ==========================================
// 删除 API 密钥 API
// ==========================================
//
// DELETE /api/admin/providers/:id/keys/:keyId
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
    // 检查 API 密钥是否存在且属于该 Provider
    const apiKey = await prisma.providerApiKey.findFirst({
      where: {
        id: keyId,
        providerId
      }
    })

    if (!apiKey) {
      throw createError({
        statusCode: 404,
        message: 'API 密钥不存在'
      })
    }

    // 检查该 Provider 是否至少还有其他一个可用的密钥
    const otherActiveKeys = await prisma.providerApiKey.count({
      where: {
        providerId,
        id: { not: keyId },
        isActive: true
      }
    })

    if (otherActiveKeys === 0 && apiKey.isActive) {
      throw createError({
        statusCode: 400,
        message: '无法删除最后一个可用的 API 密钥，请先添加其他密钥或禁用该密钥'
      })
    }

    // 删除 API 密钥
    await prisma.providerApiKey.delete({
      where: { id: keyId }
    })

    return {
      success: true,
      message: `API 密钥 "${apiKey.name}" 已删除`,
      data: {
        deletedKey: {
          id: apiKey.id,
          name: apiKey.name
        }
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `删除 API 密钥失败: ${error.message}`
    })
  }
})
