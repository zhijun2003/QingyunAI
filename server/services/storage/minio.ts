/**
 * MinIO 对象存储服务
 *
 * 使用 MinIO（兼容 S3 API）存储文件
 */

import * as Minio from 'minio'
import { Readable } from 'stream'
import { StorageService, type UploadResult } from './base'

export class MinIOStorageService extends StorageService {
  private client: Minio.Client
  private bucket: string

  constructor() {
    super()

    // MinIO 客户端配置
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    })

    this.bucket = process.env.MINIO_BUCKET || 'attachments'
  }

  /**
   * 确保 Bucket 存在
   */
  private async ensureBucketExists(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket)

    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1')

      // 设置 Bucket 为公开读取（可选）
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`]
          }
        ]
      }

      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
    }
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
    await this.ensureBucketExists()

    const userId = options?.userId || 'anonymous'
    const storagePath = this.generateStoragePath(userId, filename)

    // 上传文件
    await this.client.putObject(
      this.bucket,
      storagePath,
      buffer,
      buffer.length,
      {
        'Content-Type': mimeType
      }
    )

    // 生成访问 URL
    const url = await this.getUrl(storagePath)

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

      await this.client.putObject(
        this.bucket,
        thumbnailPath,
        thumbnailBuffer,
        thumbnailBuffer.length,
        {
          'Content-Type': 'image/webp'
        }
      )

      result.thumbnailUrl = await this.getUrl(thumbnailPath)
    }

    return result
  }

  /**
   * 删除文件
   */
  async delete(storagePath: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, storagePath)

      // 尝试删除缩略图
      const thumbnailPath = storagePath.replace(/\.[^.]+$/, '_thumb.webp')

      try {
        await this.client.removeObject(this.bucket, thumbnailPath)
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
      const { protocol, host, port } = this.client
      const baseUrl = `${protocol}//${host}:${port}`
      return `${baseUrl}/${this.bucket}/${storagePath}`
    }

    // 临时签名 URL（默认 7 天）
    const expires = expiresIn || 7 * 24 * 60 * 60

    return await this.client.presignedGetObject(this.bucket, storagePath, expires)
  }

  /**
   * 检查文件是否存在
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, storagePath)
      return true
    } catch {
      return false
    }
  }
}
