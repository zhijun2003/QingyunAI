/**
 * 文件上传 API
 *
 * POST /api/files/upload
 *
 * 支持的文件类型：
 * - 图片：jpg, jpeg, png, gif, webp（最大 10MB）
 * - 文档：pdf, doc, docx, txt, md（最大 50MB）
 * - 表格：xls, xlsx, csv（最大 20MB）
 */

import { prisma } from '@qingyun/database'
import { getStorageService } from '~/server/services/storage/factory'

// 文件类型配置
const FILE_TYPE_CONFIG = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/']
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/']
  },
  spreadsheet: {
    extensions: ['xls', 'xlsx', 'csv'],
    maxSize: 20 * 1024 * 1024, // 20MB
    mimeTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
  }
}

/**
 * 验证文件类型
 */
function validateFileType(filename: string, mimeType: string): { valid: boolean; error?: string } {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (!ext) {
    return { valid: false, error: '无法识别文件扩展名' }
  }

  // 检查是否为支持的文件类型
  for (const [category, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.extensions.includes(ext)) {
      // 检查 MIME 类型是否匹配
      const mimeMatches = config.mimeTypes.some(prefix => mimeType.startsWith(prefix))

      if (!mimeMatches) {
        return { valid: false, error: `文件类型不匹配: ${mimeType}` }
      }

      return { valid: true }
    }
  }

  return { valid: false, error: `不支持的文件类型: ${ext}` }
}

/**
 * 获取文件大小限制
 */
function getMaxFileSize(filename: string): number {
  const ext = filename.split('.').pop()?.toLowerCase()

  for (const config of Object.values(FILE_TYPE_CONFIG)) {
    if (config.extensions.includes(ext || '')) {
      return config.maxSize
    }
  }

  return 10 * 1024 * 1024 // 默认 10MB
}

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      message: '请先登录'
    })
  }

  try {
    // 解析 multipart/form-data
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: '未找到上传的文件'
      })
    }

    // 获取文件数据
    const fileItem = formData.find(item => item.name === 'file')

    if (!fileItem || !fileItem.data) {
      throw createError({
        statusCode: 400,
        message: '未找到文件数据'
      })
    }

    const filename = fileItem.filename || 'untitled'
    const mimeType = fileItem.type || 'application/octet-stream'
    const buffer = fileItem.data

    // 验证文件类型
    const typeValidation = validateFileType(filename, mimeType)

    if (!typeValidation.valid) {
      throw createError({
        statusCode: 400,
        message: typeValidation.error
      })
    }

    // 验证文件大小
    const maxSize = getMaxFileSize(filename)

    if (buffer.length > maxSize) {
      throw createError({
        statusCode: 400,
        message: `文件大小超过限制: ${Math.round(maxSize / 1024 / 1024)}MB`
      })
    }

    // 获取存储服务
    const storageService = await getStorageService()

    // 上传文件
    const uploadResult = await storageService.upload(buffer, filename, mimeType, {
      userId: session.user.userId,
      generateThumbnail: true
    })

    // 保存附件记录到数据库
    const attachment = await prisma.attachment.create({
      data: {
        userId: session.user.userId,
        filename,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        storageType: process.env.STORAGE_TYPE || 'LOCAL',
        storagePath: uploadResult.storagePath,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        width: uploadResult.width,
        height: uploadResult.height,
        uploadStatus: 'completed'
      }
    })

    return {
      success: true,
      message: '文件上传成功',
      data: {
        id: attachment.id,
        filename: attachment.filename,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        url: attachment.url,
        thumbnailUrl: attachment.thumbnailUrl,
        width: attachment.width,
        height: attachment.height,
        createdAt: attachment.createdAt
      }
    }
  } catch (error: any) {
    console.error('文件上传失败:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '文件上传失败'
    })
  }
})
