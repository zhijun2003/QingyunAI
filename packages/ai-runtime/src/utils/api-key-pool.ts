// ==========================================
// 清云AI - API 密钥池
// ==========================================
//
// 实现 API 密钥的加权轮询和故障转移
// - 加权随机选择
// - 优先级排序
// - 错误跟踪和自动禁用
// - 用量限额检查
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import type { ProviderApiKey } from '@qingyun/database'
import { decrypt } from './encryption'

export class ApiKeyPool {
  /**
   * 获取可用的 API 密钥（加权轮询 + 优先级）
   * @param providerId Provider ID
   * @returns 解密后的 API 密钥和密钥 ID
   */
  async getAvailableKey(providerId: string): Promise<{
    keyId: string
    apiKey: string
    keyInfo: ProviderApiKey
  }> {
    // 获取所有可用密钥
    const keys = await prisma.providerApiKey.findMany({
      where: {
        providerId,
        isActive: true,
        errorCount: { lt: 5 } // 连续错误少于 5 次
      },
      orderBy: [
        { priority: 'asc' },   // 优先级越小越优先
        { lastUsedAt: 'asc' }  // 最近最少使用
      ]
    })

    if (keys.length === 0) {
      throw new Error(`Provider ${providerId} 没有可用的 API 密钥`)
    }

    // 过滤掉超过限额的密钥
    const availableKeys = keys.filter(key => {
      // 检查每日限额
      if (key.dailyLimit && key.dailyUsed >= key.dailyLimit) {
        return false
      }
      // 检查每月限额
      if (key.monthlyLimit && key.monthlyUsed >= key.monthlyLimit) {
        return false
      }
      return true
    })

    if (availableKeys.length === 0) {
      throw new Error(`Provider ${providerId} 的所有密钥都已达到限额`)
    }

    // 加权随机选择
    const selectedKey = this.weightedRandomSelect(availableKeys)

    // 更新使用时间和计数
    await this.updateKeyUsage(selectedKey.id)

    // 解密密钥
    const decryptedKey = decrypt(
      selectedKey.keyEncrypted,
      selectedKey.keyIv
    )

    return {
      keyId: selectedKey.id,
      apiKey: decryptedKey,
      keyInfo: selectedKey
    }
  }

  /**
   * 加权随机选择
   * @param keys 可用密钥列表
   * @returns 选中的密钥
   */
  private weightedRandomSelect(keys: ProviderApiKey[]): ProviderApiKey {
    // 计算总权重
    const totalWeight = keys.reduce((sum, key) => sum + key.weight, 0)

    // 生成随机数
    let random = Math.random() * totalWeight

    // 选择密钥
    for (const key of keys) {
      random -= key.weight
      if (random <= 0) {
        return key
      }
    }

    // 兜底：返回第一个
    return keys[0]
  }

  /**
   * 更新密钥使用情况
   * @param keyId 密钥 ID
   */
  async updateKeyUsage(keyId: string): Promise<void> {
    await prisma.providerApiKey.update({
      where: { id: keyId },
      data: {
        lastUsedAt: new Date(),
        dailyUsed: { increment: 1 },
        monthlyUsed: { increment: 1 }
      }
    })
  }

  /**
   * 记录错误
   * @param keyId 密钥 ID
   * @param error 错误信息
   */
  async recordError(keyId: string, error?: string): Promise<void> {
    const key = await prisma.providerApiKey.update({
      where: { id: keyId },
      data: { errorCount: { increment: 1 } }
    })

    // 连续错误超过 5 次，自动禁用
    if (key.errorCount >= 5) {
      await prisma.providerApiKey.update({
        where: { id: keyId },
        data: { isActive: false }
      })

      // TODO: 发送告警通知管理员
      console.error(
        `⚠️ API 密钥 ${key.name} (${keyId}) 因连续错误被禁用`,
        error
      )

      // TODO: 集成通知系统
      // await notifyAdmin({
      //   type: 'API_KEY_DISABLED',
      //   keyId,
      //   keyName: key.name,
      //   errorCount: key.errorCount,
      //   error
      // })
    }
  }

  /**
   * 重置错误计数（成功调用后）
   * @param keyId 密钥 ID
   */
  async resetErrorCount(keyId: string): Promise<void> {
    await prisma.providerApiKey.update({
      where: { id: keyId },
      data: { errorCount: 0 }
    })
  }

  /**
   * 重置每日用量（定时任务调用）
   */
  async resetDailyUsage(): Promise<void> {
    await prisma.providerApiKey.updateMany({
      data: {
        dailyUsed: 0,
        lastResetAt: new Date()
      }
    })
  }

  /**
   * 重置每月用量（定时任务调用）
   */
  async resetMonthlyUsage(): Promise<void> {
    await prisma.providerApiKey.updateMany({
      data: { monthlyUsed: 0 }
    })
  }

  /**
   * 获取密钥统计信息
   * @param keyId 密钥 ID
   */
  async getKeyStats(keyId: string): Promise<{
    key: ProviderApiKey
    usagePercent: {
      daily?: number
      monthly?: number
    }
  }> {
    const key = await prisma.providerApiKey.findUnique({
      where: { id: keyId }
    })

    if (!key) {
      throw new Error(`密钥 ${keyId} 不存在`)
    }

    const usagePercent: { daily?: number; monthly?: number } = {}

    if (key.dailyLimit) {
      usagePercent.daily = (key.dailyUsed / key.dailyLimit) * 100
    }

    if (key.monthlyLimit) {
      usagePercent.monthly = (key.monthlyUsed / key.monthlyLimit) * 100
    }

    return { key, usagePercent }
  }

  /**
   * 获取 Provider 的所有密钥状态
   * @param providerId Provider ID
   */
  async getProviderKeysStatus(providerId: string): Promise<{
    total: number
    active: number
    disabled: number
    overLimit: number
    nearLimit: number
  }> {
    const keys = await prisma.providerApiKey.findMany({
      where: { providerId }
    })

    const total = keys.length
    const active = keys.filter(k => k.isActive && k.errorCount < 5).length
    const disabled = keys.filter(k => !k.isActive || k.errorCount >= 5).length

    let overLimit = 0
    let nearLimit = 0

    for (const key of keys) {
      // 检查是否超过限额
      const dailyOver = key.dailyLimit && key.dailyUsed >= key.dailyLimit
      const monthlyOver = key.monthlyLimit && key.monthlyUsed >= key.monthlyLimit
      if (dailyOver || monthlyOver) {
        overLimit++
        continue
      }

      // 检查是否接近限额（>= 90%）
      const dailyPercent = key.dailyLimit ? (key.dailyUsed / key.dailyLimit) : 0
      const monthlyPercent = key.monthlyLimit ? (key.monthlyUsed / key.monthlyLimit) : 0
      if (dailyPercent >= 0.9 || monthlyPercent >= 0.9) {
        nearLimit++
      }
    }

    return {
      total,
      active,
      disabled,
      overLimit,
      nearLimit
    }
  }
}

// 导出单例
export const apiKeyPool = new ApiKeyPool()
