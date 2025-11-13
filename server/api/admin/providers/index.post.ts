// ==========================================
// 添加 Provider API
// ==========================================
//
// POST /api/admin/providers
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { encrypt } from '@qingyun/ai-runtime'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 验证必填字段
  if (!body.name || !body.displayName || !body.type || !body.baseUrl) {
    throw createError({
      statusCode: 400,
      message: '缺少必填字段'
    })
  }

  try {
    // 检查名称是否重复
    const existing = await prisma.provider.findUnique({
      where: { name: body.name }
    })

    if (existing) {
      throw createError({
        statusCode: 409,
        message: `Provider ${body.name} 已存在`
      })
    }

    // 创建 Provider
    const provider = await prisma.provider.create({
      data: {
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        logo: body.logo,
        website: body.website,
        type: body.type,
        baseUrl: body.baseUrl,
        autoSync: body.autoSync ?? false,
        syncInterval: body.syncInterval ?? 3600,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0
      }
    })

    // 如果提供了 API 密钥，创建密钥记录
    if (body.apiKeys && Array.isArray(body.apiKeys)) {
      for (const keyData of body.apiKeys) {
        if (keyData.key) {
          const { encrypted, iv, tag } = encrypt(keyData.key)

          await prisma.providerApiKey.create({
            data: {
              providerId: provider.id,
              name: keyData.name || '默认密钥',
              keyEncrypted: encrypted,
              keyIv: `${iv}:${tag}`,
              weight: keyData.weight ?? 1,
              priority: keyData.priority ?? 0,
              dailyLimit: keyData.dailyLimit,
              monthlyLimit: keyData.monthlyLimit,
              isActive: true
            }
          })
        }
      }
    }

    // 返回完整的 Provider 信息（包含密钥）
    const result = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: {
        apiKeys: {
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
            createdAt: true
          }
        }
      }
    })

    return {
      success: true,
      message: 'Provider 创建成功',
      data: result
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `创建 Provider 失败: ${error.message}`
    })
  }
})
