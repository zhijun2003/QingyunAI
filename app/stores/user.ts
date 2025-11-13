// ==========================================
// 用户状态管理 Store
// ==========================================
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { defineStore } from 'pinia'

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
  const token = ref<string | null>(null)
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // 从 localStorage 初始化
  if (import.meta.client) {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user_info')
    if (savedToken) {
      token.value = savedToken
    }
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch (e) {
        console.error('Failed to parse saved user info:', e)
      }
    }
  }

  // 登录
  async function login(credentials: {
    login: string
    password: string
  }): Promise<boolean> {
    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: { user: User; token: string }
      }>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      })

      if (response.success) {
        user.value = response.data.user
        token.value = response.data.token

        // 保存到 localStorage
        if (import.meta.client) {
          localStorage.setItem('auth_token', response.data.token)
          localStorage.setItem('user_info', JSON.stringify(response.data.user))
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
  }): Promise<boolean> {
    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: { user: User; token: string }
      }>('/api/auth/register', {
        method: 'POST',
        body: data,
      })

      if (response.success) {
        user.value = response.data.user
        token.value = response.data.token

        // 保存到 localStorage
        if (import.meta.client) {
          localStorage.setItem('auth_token', response.data.token)
          localStorage.setItem('user_info', JSON.stringify(response.data.user))
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
  function logout() {
    user.value = null
    token.value = null

    // 清除 localStorage
    if (import.meta.client) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
    }
  }

  // 获取当前用户信息
  async function fetchUserInfo(): Promise<boolean> {
    if (!token.value) return false

    try {
      const { $fetch } = useNuxtApp()
      const response = await $fetch<{
        success: boolean
        data: User
      }>('/api/user/me', {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })

      if (response.success) {
        user.value = response.data
        // 更新 localStorage
        if (import.meta.client) {
          localStorage.setItem('user_info', JSON.stringify(response.data))
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Fetch user info failed:', error)
      // 如果是认证错误，清除登录状态
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 401) {
          logout()
        }
      }
      return false
    }
  }

  // 更新用户信息
  function updateUser(newUserData: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...newUserData }
      // 更新 localStorage
      if (import.meta.client) {
        localStorage.setItem('user_info', JSON.stringify(user.value))
      }
    }
  }

  return {
    user: readonly(user),
    token: readonly(token),
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchUserInfo,
    updateUser,
  }
})
