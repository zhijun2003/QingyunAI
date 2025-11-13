// ==========================================
// 模型同步服务
// ==========================================
//
// 负责从 Provider 自动拉取和同步模型列表
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { createAdapter } from '@qingyun/ai-runtime'
import { decrypt } from '@qingyun/ai-runtime'

/**
 * 同步单个 Provider 的模型
 */
export async function syncProviderModels(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { apiKeys: { where: { isActive: true } } }
  })

  if (!provider) {
    throw new Error(`Provider ${providerId} 不存在`)
  }

  if (!provider.apiKeys || provider.apiKeys.length === 0) {
    throw new Error(`Provider ${provider.name} 没有可用的 API 密钥`)
  }

  // 使用第一个可用密钥
  const apiKeyRecord = provider.apiKeys[0]
  const apiKey = decrypt(apiKeyRecord.keyEncrypted, apiKeyRecord.keyIv)

  // 创建适配器
  const adapter = createAdapter({
    provider,
    apiKey
  })

  try {
    // 拉取模型列表
    const models = await adapter.fetchModels()

    let created = 0
    let updated = 0
    let skipped = 0

    // 批量处理模型
    for (const modelInfo of models) {
      const existing = await prisma.model.findUnique({
        where: {
          providerId_modelName: {
            providerId: provider.id,
            modelName: modelInfo.modelName
          }
        }
      })

      if (existing) {
        // 更新现有模型
        // 只在价格来源为 AUTO 时更新价格
        if (existing.priceSource === 'AUTO') {
          await prisma.model.update({
            where: { id: existing.id },
            data: {
              displayName: modelInfo.displayName,
              category: modelInfo.category,
              maxTokens: modelInfo.maxTokens,
              contextWindow: modelInfo.contextWindow,
              inputPrice: modelInfo.inputPrice,
              outputPrice: modelInfo.outputPrice,
              perCallPrice: modelInfo.perCallPrice,
              upstreamPrice: modelInfo.inputPrice,
              supportStream: modelInfo.supportStream,
              supportVision: modelInfo.supportVision,
              supportFunction: modelInfo.supportFunction,
              lastSyncAt: new Date()
            }
          })
          updated++
        } else {
          // 只更新上游价格，不更新实际价格
          await prisma.model.update({
            where: { id: existing.id },
            data: {
              upstreamPrice: modelInfo.inputPrice,
              lastSyncAt: new Date()
            }
          })
          skipped++
        }
      } else {
        // 创建新模型
        await prisma.model.create({
          data: {
            providerId: provider.id,
            modelName: modelInfo.modelName,
            displayName: modelInfo.displayName,
            category: modelInfo.category,
            groupName: inferGroupName(modelInfo.category),
            maxTokens: modelInfo.maxTokens,
            contextWindow: modelInfo.contextWindow,
            billingType: modelInfo.billingType,
            inputPrice: modelInfo.inputPrice,
            outputPrice: modelInfo.outputPrice,
            perCallPrice: modelInfo.perCallPrice,
            priceSource: 'AUTO',
            upstreamPrice: modelInfo.inputPrice,
            supportStream: modelInfo.supportStream,
            supportVision: modelInfo.supportVision,
            supportFunction: modelInfo.supportFunction,
            isActive: true,
            lastSyncAt: new Date()
          }
        })
        created++
      }
    }

    // 更新 Provider 同步状态
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: `成功：新增 ${created} 个，更新 ${updated} 个，跳过 ${skipped} 个`
      }
    })

    return {
      success: true,
      created,
      updated,
      skipped,
      total: models.length
    }
  } catch (error: any) {
    // 记录同步失败
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: `失败：${error.message}`
      }
    })

    throw error
  }
}

/**
 * 同步所有启用了自动同步的 Provider
 */
export async function syncAllProviders() {
  const providers = await prisma.provider.findMany({
    where: {
      autoSync: true,
      isActive: true
    }
  })

  const results = []

  for (const provider of providers) {
    try {
      const result = await syncProviderModels(provider.id)
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        ...result
      })
    } catch (error: any) {
      console.error(`同步 Provider ${provider.name} 失败:`, error)
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

/**
 * 根据 category 推断分组名
 */
function inferGroupName(category: string): string {
  const groupMap: Record<string, string> = {
    CHAT: '对话模型',
    IMAGE: '绘图模型',
    VIDEO: '视频生成',
    AUDIO: '语音模型',
    MUSIC: '音乐生成',
    EMBEDDING: '嵌入模型'
  }

  return groupMap[category] || '未分组'
}

/**
 * 测试 Provider 连接
 */
export async function testProviderConnection(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { apiKeys: { where: { isActive: true } } }
  })

  if (!provider) {
    throw new Error(`Provider ${providerId} 不存在`)
  }

  if (!provider.apiKeys || provider.apiKeys.length === 0) {
    throw new Error(`Provider ${provider.name} 没有可用的 API 密钥`)
  }

  const apiKeyRecord = provider.apiKeys[0]
  const apiKey = decrypt(apiKeyRecord.keyEncrypted, apiKeyRecord.keyIv)

  const adapter = createAdapter({
    provider,
    apiKey
  })

  return await adapter.testConnection()
}
