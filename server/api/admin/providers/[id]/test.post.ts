// ==========================================
// 测试 Provider 连接 API
// ==========================================
//
// POST /api/admin/providers/:id/test
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { testProviderConnection } from '~/server/services/model-sync.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID 不能为空'
    })
  }

  try {
    const isConnected = await testProviderConnection(id)

    return {
      success: isConnected,
      message: isConnected ? '连接成功' : '连接失败'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `测试连接失败: ${error.message}`
    })
  }
})
