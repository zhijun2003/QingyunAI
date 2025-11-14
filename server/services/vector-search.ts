/**
 * 向量检索服务
 *
 * 使用 pgvector 进行向量相似度搜索
 */

import { prisma } from '@qingyun/database'

/**
 * 检索结果
 */
export interface SearchResult {
  chunkId: string
  content: string
  filename: string
  similarity: number
  metadata?: any
}

/**
 * 向量检索服务
 */
export class VectorSearchService {
  /**
   * 搜索相似文档块
   *
   * @param knowledgeBaseId 知识库ID
   * @param queryEmbedding 查询向量
   * @param options 检索选项
   * @returns 检索结果
   */
  async search(
    knowledgeBaseId: string,
    queryEmbedding: number[],
    options: {
      topK?: number
      threshold?: number
    } = {}
  ): Promise<SearchResult[]> {
    const { topK = 5, threshold = 0.7 } = options

    try {
      // 使用 pgvector 进行余弦相似度搜索
      // 1 - (embedding <=> query_vector) = 余弦相似度
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          dc.id as "chunkId",
          dc.content,
          d.filename,
          1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity,
          dc.metadata
        FROM "DocumentChunk" dc
        INNER JOIN "Document" d ON dc."documentId" = d.id
        WHERE d."knowledgeBaseId" = ${knowledgeBaseId}
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}
        ORDER BY dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${topK}
      `

      return results.map(row => ({
        chunkId: row.chunkId,
        content: row.content,
        filename: row.filename,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata
      }))
    } catch (error: any) {
      throw new Error(`向量检索失败: ${error.message}`)
    }
  }

  /**
   * 搜索相似文档块（多个知识库）
   */
  async searchMultiple(
    knowledgeBaseIds: string[],
    queryEmbedding: number[],
    options: {
      topK?: number
      threshold?: number
    } = {}
  ): Promise<SearchResult[]> {
    const { topK = 5, threshold = 0.7 } = options

    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          dc.id as "chunkId",
          dc.content,
          d.filename,
          d."knowledgeBaseId",
          1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity,
          dc.metadata
        FROM "DocumentChunk" dc
        INNER JOIN "Document" d ON dc."documentId" = d.id
        WHERE d."knowledgeBaseId" = ANY(${knowledgeBaseIds})
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}
        ORDER BY dc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${topK}
      `

      return results.map(row => ({
        chunkId: row.chunkId,
        content: row.content,
        filename: row.filename,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata
      }))
    } catch (error: any) {
      throw new Error(`多知识库向量检索失败: ${error.message}`)
    }
  }
}

// 导出单例
export const vectorSearchService = new VectorSearchService()
