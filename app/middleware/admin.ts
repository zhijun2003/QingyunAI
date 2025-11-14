// ==========================================
// 管理员权限中间件
// ==========================================
//
// 检查用户是否为管理员，非管理员禁止访问
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(() => {
  // 只在客户端执行
  if (import.meta.server) return

  const userStore = useUserStore()

  // 检查是否登录
  if (!userStore.isLoggedIn) {
    return navigateTo('/login')
  }

  // 检查是否为管理员
  if (!userStore.isAdmin) {
    return navigateTo('/')
  }
})
