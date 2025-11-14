/**
 * 上传文档到知识库
 * POST /api/knowledge-bases/:id/documents
 */

import { prisma } from '@qingyun/database'
import { getStorageService } from '~/server/services/storage/factory'
import { documentParser } from '~/server/services/document-parser'
import { documentChunker } from '~/server/services/document-chunker'
import { embeddingService } from '~/server/services/embedding'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const userId = session.user.userId
  const knowledgeBaseId = getRouterParam(event, 'id')

  if (!knowledgeBaseId) {
    throw createError({ statusCode: 400, message: '缺少知识库ID' })
  }

  try {
    // 验证知识库存在并检查权限
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    })

    if (!knowledgeBase) {
      throw createError({ statusCode: 404, message: '知识库不存在' })
    }

    if (knowledgeBase.userId !== userId) {
      throw createError({ statusCode: 403, message: '无权访问此知识库' })
    }

    // 解析上传的文件
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: '未找到上传的文件' })
    }

    const fileData = formData[0]
    if (!fileData.data || !fileData.filename) {
      throw createError({ statusCode: 400, message: '文件数据无效' })
    }

    const filename = fileData.filename
    const buffer = fileData.data

    // 验证文件类型
    const fileType = filename.split('.').pop()?.toLowerCase() || ''
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'md', 'markdown', 'xls', 'xlsx', 'csv']

    if (!allowedTypes.includes(fileType)) {
      throw createError({
        statusCode: 400,
        message: `不支持的文件类型: ${fileType}，支持的类型: ${allowedTypes.join(', ')}`,
      })
    }

    // 获取存储服务
    const storageService = await getStorageService()

    // 上传文件
    const storagePath = `knowledge-bases/${knowledgeBaseId}/${Date.now()}-${filename}`
    const fileUrl = await storageService.upload(buffer, storagePath, fileData.type || 'application/octet-stream')

    // 创建文档记录
    const document = await prisma.document.create({
      data: {
        knowledgeBaseId,
        filename,
        fileSize: buffer.length,
        fileType,
        fileUrl,
        parseStatus: 'pending',
      },
    })

    // 异步处理文档解析和向量化
    // 不等待完成，立即返回
    processDocumentAsync(document.id, buffer, fileType, knowledgeBase.embeddingModel)
      .catch((error) => {
        console.error('文档处理失败:', error)
      })

    return {
      success: true,
      message: '文档上传成功，正在处理中',
      data: document,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('上传文档失败:', error)
    throw createError({
      statusCode: 500,
      message: '上传文档失败',
    })
  }
})

/**
 * 异步处理文档：解析、分块、向量化
 */
async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  fileType: string,
  embeddingModel: string
) {
  try {
    // 更新状态为处理中
    await prisma.document.update({
      where: { id: documentId },
      data: { parseStatus: 'processing' },
    })

    // 1. 解析文档
    const parseResult = await documentParser.parse(buffer, fileType)
    const text = parseResult.text

    if (!text || text.trim().length === 0) {
      throw new Error('文档内容为空')
    }

    // 2. 分块
    const chunks = documentChunker.chunk(text)

    if (chunks.length === 0) {
      throw new Error('文档分块失败')
    }

    // 3. 批量向量化
    const chunkTexts = chunks.map((chunk) => chunk.content)
    const embeddings = await embeddingService.embedBatch(chunkTexts)

    // 4. 保存文档块和向量
    const documentChunks = chunks.map((chunk, index) => ({
      documentId,
      content: chunk.content,
      chunkIndex: chunk.index,
      embedding: embeddings[index],
      metadata: chunk.metadata || {},
    }))

    // 使用原始 SQL 插入（因为 Prisma 不支持 vector 类型）
    for (const chunk of documentChunks) {
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "content", "chunkIndex", "embedding", "metadata", "createdAt")
        VALUES (
          ${`chunk_${documentId}_${chunk.chunkIndex}`},
          ${chunk.documentId},
          ${chunk.content},
          ${chunk.chunkIndex},
          ${JSON.stringify(chunk.embedding)}::vector,
          ${JSON.stringify(chunk.metadata)}::jsonb,
          NOW()
        )
      `
    }

    // 5. 更新文档状态和统计
    await prisma.document.update({
      where: { id: documentId },
      data: {
        parseStatus: 'success',
        chunkCount: chunks.length,
      },
    })

    // 6. 更新知识库统计
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { knowledgeBaseId: true },
    })

    if (document) {
      const stats = await prisma.document.aggregate({
        where: { knowledgeBaseId: document.knowledgeBaseId },
        _count: true,
        _sum: { chunkCount: true },
      })

      await prisma.knowledgeBase.update({
        where: { id: document.knowledgeBaseId },
        data: {
          documentCount: stats._count,
          chunkCount: stats._sum.chunkCount || 0,
        },
      })
    }
  } catch (error: any) {
    console.error('处理文档失败:', error)

    // 更新文档状态为失败
    await prisma.document.update({
      where: { id: documentId },
      data: {
        parseStatus: 'failed',
        parseError: error.message,
      },
    })
  }
}
