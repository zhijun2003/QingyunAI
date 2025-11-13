// ==========================================
// 前端认证中间件
// ==========================================
//
// 检查用户登录状态，未登录则跳转到登录页
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware((to, from) => {
  // 只在客户端执行
  if (import.meta.server) return

  const userStore = useUserStore()

  // 如果未登录，跳转到登录页
  if (!userStore.isLoggedIn) {
    return navigateTo('/login')
  }
})
