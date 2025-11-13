// ==========================================
// 同步所有 Provider 模型 API
// ==========================================
//
// POST /api/admin/providers/sync-all
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { syncAllProviders } from '~/server/services/model-sync.service'

export default defineEventHandler(async (event) => {
  try {
    const results = await syncAllProviders()

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return {
      success: true,
      message: `同步完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      data: results
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `同步失败: ${error.message}`
    })
  }
})
