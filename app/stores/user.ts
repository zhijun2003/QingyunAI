// ==========================================
// 用户状态管理 Store (使用 nuxt-auth-utils)
// ==========================================
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'

export interface User {
  userId: string
  username: string | null
  email: string | null
  phone: string | null
  displayName: string | null
  avatar: string | null
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  balance: number
  freeQuota: number
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // 登录
  async function login(credentials: {
    login: string
    password: string
  }): Promise<boolean> {
    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: { user: any }
      }>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      })

      if (response.success) {
        user.value = {
          userId: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          phone: response.data.user.phone,
          displayName: response.data.user.displayName,
          avatar: response.data.user.avatar,
          role: response.data.user.role,
          status: response.data.user.status,
          balance: response.data.user.balance,
          freeQuota: response.data.user.freeQuota,
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  // 注册
  async function register(data: {
    username?: string
    email?: string
    phone?: string
    password: string
    displayName?: string
  }): Promise<boolean> {
    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: { user: any }
      }>('/api/auth/register', {
        method: 'POST',
        body: data,
      })

      if (response.success) {
        user.value = {
          userId: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
          phone: response.data.user.phone,
          displayName: response.data.user.displayName,
          avatar: response.data.user.avatar,
          role: response.data.user.role,
          status: response.data.user.status,
          balance: response.data.user.balance,
          freeQuota: response.data.user.freeQuota,
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Register failed:', error)
      return false
    }
  }

  // 登出
  async function logout() {
    try {
      const { $fetch } = useNuxtApp()
      await $fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      user.value = null
    }
  }

  // 获取当前用户信息
  async function fetchUserInfo(): Promise<boolean> {
    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: any
      }>('/api/user/me')

      if (response.success) {
        user.value = {
          userId: response.data.id,
          username: response.data.username,
          email: response.data.email,
          phone: response.data.phone,
          displayName: response.data.displayName,
          avatar: response.data.avatar,
          role: response.data.role,
          status: response.data.status,
          balance: response.data.balance,
          freeQuota: response.data.freeQuota,
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Fetch user info failed:', error)
      // 如果获取失败，清空用户状态
      user.value = null
      return false
    }
  }

  // 更新用户信息
  function updateUser(newUserData: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...newUserData }
    }
  }

  return {
    user: readonly(user),
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchUserInfo,
    updateUser,
  }
})
