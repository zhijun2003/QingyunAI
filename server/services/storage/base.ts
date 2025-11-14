/**
 * 存储服务基类接口
 *
 * 定义所有存储服务的统一接口，支持 6 种存储类型：
 * - LOCAL: 本地文件系统
 * - MINIO: MinIO 对象存储
 * - COS: 腾讯云 COS
 * - OSS: 阿里云 OSS
 * - S3: AWS S3
 * - IMGBED: 免费图床（仅图片）
 */

/**
 * 文件上传结果
 */
export interface UploadResult {
  /**
   * 文件访问 URL
   */
  url: string

  /**
   * 存储路径（内部使用）
   */
  storagePath: string

  /**
   * 文件大小（字节）
   */
  fileSize: number

  /**
   * MIME 类型
   */
  mimeType: string

  /**
   * 缩略图 URL（仅图片）
   */
  thumbnailUrl?: string

  /**
   * 图片宽度（仅图片）
   */
  width?: number

  /**
   * 图片高度（仅图片）
   */
  height?: number
}

/**
 * 存储服务抽象接口
 */
export abstract class StorageService {
  /**
   * 上传文件
   *
   * @param buffer 文件缓冲区
   * @param filename 文件名
   * @param mimeType MIME 类型
   * @param options 额外选项
   * @returns 上传结果
   */
  abstract upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: {
      userId?: string
      generateThumbnail?: boolean
      thumbnailMaxWidth?: number
      isPublic?: boolean
    }
  ): Promise<UploadResult>

  /**
   * 删除文件
   *
   * @param storagePath 存储路径
   */
  abstract delete(storagePath: string): Promise<void>

  /**
   * 获取文件访问 URL
   *
   * @param storagePath 存储路径
   * @param expiresIn 过期时间（秒），null 表示永久
   * @returns 文件访问 URL
   */
  abstract getUrl(storagePath: string, expiresIn?: number | null): Promise<string>

  /**
   * 检查文件是否存在
   *
   * @param storagePath 存储路径
   * @returns 是否存在
   */
  abstract exists(storagePath: string): Promise<boolean>

  /**
   * 生成存储路径
   *
   * @param userId 用户 ID
   * @param filename 文件名
   * @returns 存储路径
   */
  protected generateStoragePath(userId: string, filename: string): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    // 生成唯一文件名（时间戳 + 随机字符串 + 原始扩展名）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = filename.substring(filename.lastIndexOf('.'))
    const uniqueFilename = `${timestamp}_${randomStr}${ext}`

    return `${userId}/${year}/${month}/${uniqueFilename}`
  }

  /**
   * 检查是否为图片
   *
   * @param mimeType MIME 类型
   * @returns 是否为图片
   */
  protected isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * 生成缩略图
   *
   * @param buffer 原始图片缓冲区
   * @param maxWidth 最大宽度
   * @returns 缩略图缓冲区
   */
  protected async generateThumbnail(buffer: Buffer, maxWidth: number = 800): Promise<Buffer> {
    const sharp = (await import('sharp')).default

    return await sharp(buffer)
      .resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer()
  }

  /**
   * 获取图片尺寸
   *
   * @param buffer 图片缓冲区
   * @returns 图片宽高
   */
  protected async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    const sharp = (await import('sharp')).default
    const metadata = await sharp(buffer).metadata()

    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    }
  }
}
