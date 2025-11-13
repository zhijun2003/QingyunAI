// ==========================================
// 获取单个模型详情 API
// ==========================================
//
// GET /api/admin/models/:id
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '模型 ID 不能为空'
    })
  }

  try {
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            icon: true,
            baseUrl: true,
            isActive: true
          }
        }
      }
    })

    if (!model) {
      throw createError({
        statusCode: 404,
        message: '模型不存在'
      })
    }

    // 查询使用统计（示例：最近 30 天的消息数）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const usageStats = await prisma.message.aggregate({
      where: {
        modelId: id,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
      _sum: {
        inputTokens: true,
        outputTokens: true
      }
    })

    // 计算价格相关信息
    const priceInfo = {
      priceSource: model.priceSource,
      currentInputPrice: model.inputPrice,
      currentOutputPrice: model.outputPrice,
      currentPerCallPrice: model.perCallPrice,
      upstreamPrice: model.upstreamPrice,
      markup: model.upstreamPrice
        ? ((model.inputPrice - model.upstreamPrice) / model.upstreamPrice * 100).toFixed(2) + '%'
        : null
    }

    return {
      success: true,
      data: {
        ...model,
        priceInfo,
        usageStats: {
          messagesLast30Days: usageStats._count,
          inputTokensLast30Days: usageStats._sum.inputTokens || 0,
          outputTokensLast30Days: usageStats._sum.outputTokens || 0
        }
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取模型详情失败: ${error.message}`
    })
  }
})
