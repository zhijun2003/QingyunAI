import { prisma } from '@qingyun/database'

/**
 * 获取系统配置（按分组）
 * @param group 配置分组，如 'checkin', 'payment', 'recharge'
 * @returns 配置对象，key为去除前缀后的配置键
 */
export async function getSystemConfig(group: string): Promise<Record<string, string>> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { group },
    })

    const result: Record<string, string> = {}
    configs.forEach((config) => {
      // 去除分组前缀，如 'checkin.enabled' -> 'enabled'
      const key = config.key.replace(`${group}.`, '')
      result[key] = config.value
    })

    return result
  } catch (error) {
    console.error(`Get system config failed for group: ${group}`, error)
    return {}
  }
}

/**
 * 获取单个系统配置
 * @param key 完整的配置键，如 'checkin.enabled'
 * @param defaultValue 默认值
 * @returns 配置值或默认值
 */
export async function getConfigValue(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    })
    return config?.value || defaultValue
  } catch (error) {
    console.error(`Get config value failed for key: ${key}`, error)
    return defaultValue
  }
}

/**
 * 更新或创建系统配置
 * @param key 配置键
 * @param value 配置值
 * @param description 描述
 * @param group 分组
 * @param valueType 值类型
 */
export async function setConfigValue(
  key: string,
  value: string,
  description?: string,
  group: string = 'general',
  valueType: string = 'string'
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value, description, group, valueType },
    create: { key, value, description, group, valueType },
  })
}

/**
 * 批量设置配置
 * @param configs 配置数组
 */
export async function setConfigs(configs: Array<{
  key: string
  value: string
  description?: string
  group: string
  valueType?: string
}>): Promise<void> {
  for (const config of configs) {
    await setConfigValue(
      config.key,
      config.value,
      config.description,
      config.group,
      config.valueType || 'string'
    )
  }
}
