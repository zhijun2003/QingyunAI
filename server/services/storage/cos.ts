/**
 * 腾讯云 COS 对象存储服务
 *
 * 使用腾讯云 COS 存储文件
 */

import COS from 'cos-nodejs-sdk-v5'
import { StorageService, type UploadResult } from './base'

export class COSStorageService extends StorageService {
  private client: COS
  private bucket: string
  private region: string

  constructor() {
    super()

    // COS 客户端配置
    this.client = new COS({
      SecretId: process.env.COS_SECRET_ID || '',
      SecretKey: process.env.COS_SECRET_KEY || ''
    })

    this.bucket = process.env.COS_BUCKET || ''
    this.region = process.env.COS_REGION || 'ap-guangzhou'
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
    const storagePath = `attachments/${this.generateStoragePath(userId, filename)}`

    // 上传文件
    await new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: storagePath,
          Body: buffer,
          ContentType: mimeType
        },
        (err, data) => {
          if (err) reject(err)
          else resolve(data)
        }
      )
    })

    // 生成访问 URL
    const url = await this.getUrl(storagePath, null)

    const result: UploadResult = {
      url,
      storagePath,
      fileSize: buffer.length,
      mimeType
    }

    // 如果是图片，生成缩略图
    if (this.isImage(mimeType) && options?.generateThumbnail !== false) {
      const dimensions = await this.getImageDimensions(buffer)
      result.width = dimensions.width
      result.height = dimensions.height

      const thumbnailMaxWidth = options?.thumbnailMaxWidth || 800
      const thumbnailBuffer = await this.generateThumbnail(buffer, thumbnailMaxWidth)

      // 缩略图路径
      const thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.webp')

      await new Promise((resolve, reject) => {
        this.client.putObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: thumbnailPath,
            Body: thumbnailBuffer,
            ContentType: 'image/webp'
          },
          (err, data) => {
            if (err) reject(err)
            else resolve(data)
          }
        )
      })

      result.thumbnailUrl = await this.getUrl(thumbnailPath, null)
    }

    return result
  }

  /**
   * 删除文件
   */
  async delete(storagePath: string): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        this.client.deleteObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: storagePath
          },
          (err, data) => {
            if (err) reject(err)
            else resolve(data)
          }
        )
      })

      // 尝试删除缩略图
      const thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.webp')

      try {
        await new Promise((resolve, reject) => {
          this.client.deleteObject(
            {
              Bucket: this.bucket,
              Region: this.region,
              Key: thumbnailPath
            },
            (err, data) => {
              if (err) reject(err)
              else resolve(data)
            }
          )
        })
      } catch {
        // 缩略图可能不存在，忽略
      }
    } catch (error: any) {
      throw new Error(`删除文件失败: ${error.message}`)
    }
  }

  /**
   * 获取文件访问 URL
   */
  async getUrl(storagePath: string, expiresIn?: number | null): Promise<string> {
    if (expiresIn === null || expiresIn === 0) {
      // 永久 URL（需要 Bucket 设置为公开读取）
      return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${storagePath}`
    }

    // 临时签名 URL（默认 1 小时）
    const expires = expiresIn || 3600

    return new Promise((resolve, reject) => {
      this.client.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: storagePath,
          Sign: true,
          Expires: expires
        },
        (err, data) => {
          if (err) reject(err)
          else resolve(data.Url)
        }
      )
    })
  }

  /**
   * 检查文件是否存在
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      await new Promise((resolve, reject) => {
        this.client.headObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: storagePath
          },
          (err, data) => {
            if (err) reject(err)
            else resolve(data)
          }
        )
      })

      return true
    } catch {
      return false
    }
  }
}
