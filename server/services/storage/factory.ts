/**
 * 存储服务工厂
 *
 * 根据系统配置动态选择存储服务类型
 * 支持：LOCAL、MinIO、COS、IMGBED
 */

import { StorageService } from './base'
import { LocalStorageService } from './local'
import { MinIOStorageService } from './minio'
import { COSStorageService } from './cos'
import { ImgBedStorageService } from './imgbed'
import { prisma } from '@qingyun/database'

// 存储服务类型
export type StorageType = 'LOCAL' | 'MINIO' | 'COS' | 'OSS' | 'S3' | 'IMGBED'

// 存储服务单例缓存
let storageServiceInstance: StorageService | null = null

/**
 * 获取存储服务实例（单例模式）
 *
 * @returns 存储服务实例
 */
export async function getStorageService(): Promise<StorageService> {
  // 如果已有缓存实例，直接返回
  if (storageServiceInstance) {
    return storageServiceInstance
  }

  // 从数据库读取存储配置
  const storageTypeConfig = await prisma.systemConfig.findUnique({
    where: { key: 'storage.default_type' }
  })

  // 获取存储类型（默认为 LOCAL）
  const storageType: StorageType = (storageTypeConfig?.value as StorageType) || 'LOCAL'

  // 如果环境变量有配置，优先使用环境变量
  const envStorageType = process.env.STORAGE_TYPE as StorageType
  const finalStorageType = envStorageType || storageType

  // 根据类型创建对应的存储服务
  switch (finalStorageType) {
    case 'LOCAL':
      storageServiceInstance = new LocalStorageService()
      break

    case 'MINIO':
      storageServiceInstance = new MinIOStorageService()
      break

    case 'COS':
      storageServiceInstance = new COSStorageService()
      break

    case 'IMGBED':
      storageServiceInstance = new ImgBedStorageService()
      break

    default:
      console.warn(`不支持的存储类型: ${finalStorageType}，使用默认的 LOCAL 存储`)
      storageServiceInstance = new LocalStorageService()
  }

  console.log(`✅ 存储服务初始化成功: ${finalStorageType}`)

  return storageServiceInstance
}

/**
 * 清除存储服务缓存（用于测试或重新初始化）
 */
export function clearStorageServiceCache(): void {
  storageServiceInstance = null
}

/**
 * 获取指定类型的存储服务（不使用缓存）
 *
 * @param storageType 存储类型
 * @returns 存储服务实例
 */
export function getStorageServiceByType(storageType: StorageType): StorageService {
  switch (storageType) {
    case 'LOCAL':
      return new LocalStorageService()

    case 'MINIO':
      return new MinIOStorageService()

    case 'COS':
      return new COSStorageService()

    case 'IMGBED':
      return new ImgBedStorageService()

    default:
      throw new Error(`不支持的存储类型: ${storageType}`)
  }
}
