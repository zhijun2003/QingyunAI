// ==========================================
// 更新 Provider API
// ==========================================
//
// PUT /api/admin/providers/:id
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    const body = await readBody(event)

    // 检查 Provider 是否存在
    const existing = await prisma.provider.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Provider 不存在'
      })
    }

    // 如果要更新名称，检查是否与其他 Provider 重复
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.provider.findFirst({
        where: {
          name: body.name,
          id: { not: id }
        }
      })

      if (duplicate) {
        throw createError({
          statusCode: 400,
          message: `Provider 名称 "${body.name}" 已存在`
        })
      }
    }

    // 更新 Provider
    const provider = await prisma.provider.update({
      where: { id },
      data: {
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        icon: body.icon,
        baseUrl: body.baseUrl,
        isActive: body.isActive,
        autoSync: body.autoSync,
        syncInterval: body.syncInterval,
        maxRetry: body.maxRetry,
        timeout: body.timeout,
        sortOrder: body.sortOrder,
        config: body.config
      },
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        models: {
          select: {
            id: true,
            modelName: true,
            isActive: true
          }
        }
      }
    })

    // 统计信息
    const stats = {
      totalKeys: provider.apiKeys.length,
      activeKeys: provider.apiKeys.filter(k => k.isActive).length,
      totalModels: provider.models.length,
      activeModels: provider.models.filter(m => m.isActive).length
    }

    return {
      success: true,
      message: 'Provider 更新成功',
      data: {
        ...provider,
        stats
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `更新 Provider 失败: ${error.message}`
    })
  }
})
