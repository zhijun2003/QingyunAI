// ==========================================
// 用户登出 API (使用 nuxt-auth-utils)
// ==========================================
//
// POST /api/auth/logout
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

export default defineEventHandler(async (event) => {
  try {
    // 清除用户会话
    await clearUserSession(event)

    return {
      success: true,
      message: '登出成功'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `登出失败: ${error.message}`
    })
  }
})
