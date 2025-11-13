// ==========================================
// API 调用工具 Composable
// ==========================================
//
// 统一的 API 请求封装，自动处理认证、错误等
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { useUserStore } from '~/stores/user'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

export function useApi() {
  const userStore = useUserStore()

  // 统一的请求方法
  async function request<T = any>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: any
      params?: Record<string, any>
      headers?: Record<string, string>
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { $fetch } = useNuxtApp()

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
      }

      // 添加认证 token
      if (userStore.token) {
        headers.Authorization = `Bearer ${userStore.token}`
      }

      // 发送请求
      const response = await $fetch<ApiResponse<T>>(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        params: options.params,
      })

      return response
    } catch (error: any) {
      console.error(`API request failed [${options.method || 'GET'} ${url}]:`, error)

      // 处理认证错误
      if (error.statusCode === 401) {
        userStore.logout()
        if (import.meta.client) {
          navigateTo('/login')
        }
      }

      return {
        success: false,
        message: error.message || error.data?.message || '请求失败',
      }
    }
  }

  // GET 请求
  function get<T = any>(url: string, params?: Record<string, any>) {
    return request<T>(url, { method: 'GET', params })
  }

  // POST 请求
  function post<T = any>(url: string, body: any) {
    return request<T>(url, { method: 'POST', body })
  }

  // PUT 请求
  function put<T = any>(url: string, body: any) {
    return request<T>(url, { method: 'PUT', body })
  }

  // DELETE 请求
  function del<T = any>(url: string) {
    return request<T>(url, { method: 'DELETE' })
  }

  return {
    request,
    get,
    post,
    put,
    delete: del,
  }
}
