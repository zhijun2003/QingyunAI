// ==========================================
// 更新模型价格 API
// ==========================================
//
// PUT /api/admin/models/:id/pricing
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
    const body = await readBody(event)

    // 检查模型是否存在
    const existing = await prisma.model.findUnique({
      where: { id }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '模型不存在'
      })
    }

    // 验证价格来源
    const validPriceSources = ['MANUAL', 'AUTO', 'UPSTREAM']
    if (body.priceSource && !validPriceSources.includes(body.priceSource)) {
      throw createError({
        statusCode: 400,
        message: `价格来源必须是以下之一: ${validPriceSources.join(', ')}`
      })
    }

    // 准备更新数据
    const updateData: any = {
      priceSource: body.priceSource,
      billingType: body.billingType
    }

    // 根据价格来源处理价格
    if (body.priceSource === 'MANUAL') {
      // 手动设置价格
      if (body.billingType === 'TOKEN') {
        updateData.inputPrice = body.inputPrice
        updateData.outputPrice = body.outputPrice
        updateData.perCallPrice = null
      } else if (body.billingType === 'PER_CALL') {
        updateData.perCallPrice = body.perCallPrice
        updateData.inputPrice = null
        updateData.outputPrice = null
      }
    } else if (body.priceSource === 'UPSTREAM') {
      // 基于上游价格加价
      const markupRate = body.markupRate || 0 // 加价率（百分比）

      if (!existing.upstreamPrice) {
        throw createError({
          statusCode: 400,
          message: '该模型没有上游价格信息，无法使用 UPSTREAM 模式'
        })
      }

      if (body.billingType === 'TOKEN') {
        updateData.inputPrice = existing.upstreamPrice * (1 + markupRate / 100)
        updateData.outputPrice = existing.upstreamPrice * (1 + markupRate / 100)
        updateData.perCallPrice = null
      }

      updateData.markupRate = markupRate
    }
    // AUTO 模式不需要手动设置价格，由同步服务自动更新

    // 更新模型价格
    const model = await prisma.model.update({
      where: { id },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    })

    return {
      success: true,
      message: '模型价格更新成功',
      data: {
        ...model,
        priceInfo: {
          priceSource: model.priceSource,
          billingType: model.billingType,
          inputPrice: model.inputPrice,
          outputPrice: model.outputPrice,
          perCallPrice: model.perCallPrice,
          upstreamPrice: model.upstreamPrice,
          markup: model.upstreamPrice && model.inputPrice
            ? ((model.inputPrice - model.upstreamPrice) / model.upstreamPrice * 100).toFixed(2) + '%'
            : null
        }
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `更新模型价格失败: ${error.message}`
    })
  }
})
