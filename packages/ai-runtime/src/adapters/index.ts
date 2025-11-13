// ==========================================
// Provider 适配器工厂
// ==========================================
//
// 根据 Provider 类型创建对应的适配器实例
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import type { Provider } from '@qingyun/database'
import type { IProviderAdapter, AdapterConfig } from '../types'
import { OpenAICompatibleAdapter } from './openai-compatible'

/**
 * 创建适配器
 */
export function createAdapter(config: AdapterConfig): IProviderAdapter {
  switch (config.provider.type) {
    case 'OPENAI':
    case 'ANTHROPIC':
    case 'DEEPSEEK':
    case 'CUSTOM':
      // 这些都使用 OpenAI 兼容格式
      return new OpenAICompatibleAdapter(config)

    case 'GEMINI':
      // TODO: 实现 Gemini 适配器
      throw new Error('Gemini 适配器尚未实现')

    case 'MIDJOURNEY':
      // TODO: 实现 Midjourney 适配器
      throw new Error('Midjourney 适配器尚未实现')

    case 'STABLE_DIFFUSION':
      // TODO: 实现 Stable Diffusion 适配器
      throw new Error('Stable Diffusion 适配器尚未实现')

    case 'KELING':
      // TODO: 实现可灵适配器
      throw new Error('可灵适配器尚未实现')

    case 'JIMENG':
      // TODO: 实现即梦适配器
      throw new Error('即梦适配器尚未实现')

    case 'RUNWAY':
      // TODO: 实现 Runway 适配器
      throw new Error('Runway 适配器尚未实现')

    case 'SUNO':
      // TODO: 实现 Suno 适配器
      throw new Error('Suno 适配器尚未实现')

    default:
      throw new Error(`不支持的 Provider 类型: ${config.provider.type}`)
  }
}

/**
 * 检查 Provider 类型是否支持
 */
export function isProviderSupported(type: Provider['type']): boolean {
  const supportedTypes = ['OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'CUSTOM']
  return supportedTypes.includes(type)
}

/**
 * 获取支持的 Provider 类型列表
 */
export function getSupportedProviderTypes(): Provider['type'][] {
  return ['OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'CUSTOM']
}

/**
 * 获取待实现的 Provider 类型列表
 */
export function getPendingProviderTypes(): Provider['type'][] {
  return ['GEMINI', 'MIDJOURNEY', 'STABLE_DIFFUSION', 'KELING', 'JIMENG', 'RUNWAY', 'SUNO']
}
