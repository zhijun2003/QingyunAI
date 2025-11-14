/**
 * 免费图床存储服务
 *
 * 使用免费图床存储图片（仅支持图片）
 * 支持的图床：img.scdn.io
 */

import { StorageService, type UploadResult } from './base'

export class ImgBedStorageService extends StorageService {
  private apiEndpoint: string

  constructor() {
    super()

    // 图床 API 端点
    this.apiEndpoint = process.env.IMGBED_ENDPOINT || 'https://img.scdn.io/api/upload'
  }

  /**
   * 上传文件（仅支持图片）
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
    // 检查是否为图片
    if (!this.isImage(mimeType)) {
      throw new Error('免费图床只支持图片文件')
    }

    // 检查文件大小（大多数图床限制在 5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (buffer.length > maxSize) {
      throw new Error('图片大小不能超过 5MB')
    }

    try {
      // 构造 FormData
      const FormData = (await import('formdata-node')).FormData
      const { Blob } = await import('buffer')

      const formData = new FormData()
      const blob = new Blob([buffer], { type: mimeType })
      formData.append('file', blob, filename)

      // 发送上传请求
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData as any
      })

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`)
      }

      const data = await response.json()

      // 解析响应（不同图床格式可能不同）
      const url = data.url || data.data?.url || data.link

      if (!url) {
        throw new Error('上传成功但未返回图片链接')
      }

      // 获取图片尺寸
      const dimensions = await this.getImageDimensions(buffer)

      const result: UploadResult = {
        url,
        storagePath: url, // 图床没有storagePath概念，直接使用URL
        fileSize: buffer.length,
        mimeType,
        width: dimensions.width,
        height: dimensions.height
      }

      // 图床通常不支持缩略图，使用原图作为缩略图
      result.thumbnailUrl = url

      return result
    } catch (error: any) {
      throw new Error(`图床上传失败: ${error.message}`)
    }
  }

  /**
   * 删除文件（图床通常不支持删除）
   */
  async delete(storagePath: string): Promise<void> {
    // 图床通常不支持删除，这里只是空实现
    console.warn('免费图床不支持删除文件')
  }

  /**
   * 获取文件访问 URL
   */
  async getUrl(storagePath: string, expiresIn?: number | null): Promise<string> {
    // 图床返回的就是永久URL
    return storagePath
  }

  /**
   * 检查文件是否存在（图床无法检查）
   */
  async exists(storagePath: string): Promise<boolean> {
    // 图床无法检查文件是否存在，默认返回 true
    return true
  }
}
