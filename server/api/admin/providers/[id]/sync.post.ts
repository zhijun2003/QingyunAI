// ==========================================
// 同步 Provider 模型 API
// ==========================================
//
// POST /api/admin/providers/:id/sync
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { syncProviderModels } from '../../../../services/model-sync.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    const result = await syncProviderModels(id)

    return {
      success: true,
      message: `同步完成：新增 ${result.created} 个，更新 ${result.updated} 个，跳过 ${result.skipped} 个`,
      data: result
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `同步失败: ${error.message}`
    })
  }
})
