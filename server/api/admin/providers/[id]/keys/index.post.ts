// ==========================================
// 添加 API 密钥 API
// ==========================================
//
// POST /api/admin/providers/:id/keys
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { encrypt } from '@qingyun/ai-runtime'

export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, 'id')

  if (!providerId) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    const body = await readBody(event)

    // 验证必填字段
    if (!body.key) {
      throw createError({
        statusCode: 400,
        message: 'API 密钥不能为空'
      })
    }

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

    // 加密 API 密钥
    const { encrypted, iv, tag } = encrypt(body.key)

    // 创建 API 密钥记录
    const apiKey = await prisma.providerApiKey.create({
      data: {
        providerId,
        name: body.name || '默认密钥',
        keyEncrypted: encrypted,
        keyIv: `${iv}:${tag}`,
        weight: body.weight ?? 1,
        priority: body.priority ?? 0,
        dailyLimit: body.dailyLimit,
        monthlyLimit: body.monthlyLimit,
        isActive: body.isActive ?? true
      }
    })

    // 返回时不包含加密内容
    const { keyEncrypted, keyIv, ...safeApiKey } = apiKey

    return {
      success: true,
      message: 'API 密钥添加成功',
      data: safeApiKey
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `添加 API 密钥失败: ${error.message}`
    })
  }
})
