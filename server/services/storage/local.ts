/**
 * 本地存储服务
 *
 * 使用本地文件系统存储文件
 * 存储路径：uploads/{userId}/{year}/{month}/{filename}
 */

import { promises as fs } from 'fs'
import path from 'path'
import { StorageService, type UploadResult } from './base'

export class LocalStorageService extends StorageService {
  private baseDir: string
  private baseUrl: string

  constructor() {
    super()

    // 基础存储目录
    this.baseDir = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads')

    // 基础访问 URL
    this.baseUrl = process.env.LOCAL_STORAGE_URL || '/uploads'
  }

  /**
   * 上传文件
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: {
      userId?: string
      generateThumbnail?: boolean
      thumbnailMaxWidth?: number
      isPublic?: boolean
    }
  ): Promise<UploadResult> {
    const userId = options?.userId || 'anonymous'

    // 生成存储路径
    const storagePath = this.generateStoragePath(userId, filename)
    const fullPath = path.join(this.baseDir, storagePath)

    // 确保目录存在
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    // 写入文件
    await fs.writeFile(fullPath, buffer)

    // 生成访问 URL
    const url = `${this.baseUrl}/${storagePath.replace(/\\/g, '/')}`

    const result: UploadResult = {
      url,
      storagePath,
      fileSize: buffer.length,
      mimeType
    }

    // 如果是图片，生成缩略图和获取尺寸
    if (this.isImage(mimeType) && options?.generateThumbnail !== false) {
      // 获取图片尺寸
      const dimensions = await this.getImageDimensions(buffer)
      result.width = dimensions.width
      result.height = dimensions.height

      // 生成缩略图
      const thumbnailMaxWidth = options?.thumbnailMaxWidth || 800
      const thumbnailBuffer = await this.generateThumbnail(buffer, thumbnailMaxWidth)

      // 缩略图路径（添加 _thumb 后缀）
      const ext = path.extname(storagePath)
      const thumbnailPath = storagePath.replace(ext, `_thumb.webp`)
      const thumbnailFullPath = path.join(this.baseDir, thumbnailPath)

      // 写入缩略图
      await fs.writeFile(thumbnailFullPath, thumbnailBuffer)

      result.thumbnailUrl = `${this.baseUrl}/${thumbnailPath.replace(/\\/g, '/')}`
    }

    return result
  }

  /**
   * 删除文件
   */
  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, storagePath)

    try {
      // 删除原文件
      await fs.unlink(fullPath)

      // 如果有缩略图，也删除
      const ext = path.extname(storagePath)
      const thumbnailPath = storagePath.replace(ext, `_thumb.webp`)
      const thumbnailFullPath = path.join(this.baseDir, thumbnailPath)

      try {
        await fs.unlink(thumbnailFullPath)
      } catch (err) {
        // 缩略图可能不存在，忽略错误
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`删除文件失败: ${error.message}`)
      }
      // 文件不存在，忽略
    }
  }

  /**
   * 获取文件访问 URL
   */
  async getUrl(storagePath: string, expiresIn?: number | null): Promise<string> {
    // 本地存储不支持过期时间，直接返回永久 URL
    return `${this.baseUrl}/${storagePath.replace(/\\/g, '/')}`
  }

  /**
   * 检查文件是否存在
   */
  async exists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, storagePath)

    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}
