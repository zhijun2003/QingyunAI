/**
 * RAG 对话增强服务
 *
 * 使用知识库检索增强 AI 对话
 */

import { embeddingService } from './embedding'
import { vectorSearchService } from './vector-search'
import type { SearchResult } from './vector-search'

/**
 * RAG 增强选项
 */
export interface RAGOptions {
  knowledgeBaseIds: string[] // 知识库ID列表
  topK?: number // 检索文档块数量
  threshold?: number // 相似度阈值
  maxContextLength?: number // 最大上下文长度（字符）
}

/**
 * RAG 增强结果
 */
export interface RAGResult {
  enhancedPrompt: string // 增强后的提示词
  sources: SearchResult[] // 引用来源
  contextUsed: boolean // 是否使用了知识库上下文
}

/**
 * RAG 对话增强服务
 */
export class RAGChatService {
  /**
   * 增强用户查询
   *
   * @param userQuery 用户查询
   * @param options RAG 选项
   * @returns 增强结果
   */
  async enhanceQuery(userQuery: string, options: RAGOptions): Promise<RAGResult> {
    const {
      knowledgeBaseIds,
      topK = 5,
      threshold = 0.7,
      maxContextLength = 4000,
    } = options

    try {
      // 1. 向量化用户查询
      const queryEmbedding = await embeddingService.embedText(userQuery)

      // 2. 检索相关文档块
      let allResults: SearchResult[] = []

      for (const knowledgeBaseId of knowledgeBaseIds) {
        const results = await vectorSearchService.search(knowledgeBaseId, queryEmbedding, {
          topK,
          threshold,
        })
        allResults = allResults.concat(results)
      }

      // 3. 按相似度排序并去重
      allResults.sort((a, b) => b.similarity - a.similarity)
      allResults = allResults.slice(0, topK)

      // 4. 如果没有检索到相关内容，直接返回原始查询
      if (allResults.length === 0) {
        return {
          enhancedPrompt: userQuery,
          sources: [],
          contextUsed: false,
        }
      }

      // 5. 构造增强的提示词
      const enhancedPrompt = this.buildEnhancedPrompt(userQuery, allResults, maxContextLength)

      return {
        enhancedPrompt,
        sources: allResults,
        contextUsed: true,
      }
    } catch (error: any) {
      console.error('RAG 增强失败:', error)
      // 失败时返回原始查询
      return {
        enhancedPrompt: userQuery,
        sources: [],
        contextUsed: false,
      }
    }
  }

  /**
   * 构造增强的提示词
   *
   * @param userQuery 用户查询
   * @param sources 检索到的文档块
   * @param maxContextLength 最大上下文长度
   * @returns 增强后的提示词
   */
  private buildEnhancedPrompt(
    userQuery: string,
    sources: SearchResult[],
    maxContextLength: number
  ): string {
    // 构建上下文部分
    let context = ''
    let currentLength = 0

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      const sourceText = `[文档${i + 1}] ${source.filename}\n${source.content}\n\n`

      if (currentLength + sourceText.length > maxContextLength) {
        break
      }

      context += sourceText
      currentLength += sourceText.length
    }

    // 构造最终提示词
    const prompt = `请基于以下知识库内容回答用户的问题。如果知识库内容不足以回答问题，请说明并给出你的最佳建议。

知识库内容：
${context}

用户问题：
${userQuery}

请回答：`

    return prompt
  }

  /**
   * 格式化引用来源（用于前端显示）
   *
   * @param sources 检索到的文档块
   * @returns 格式化的来源列表
   */
  formatSources(sources: SearchResult[]): Array<{
    filename: string
    content: string
    similarity: number
    preview: string
  }> {
    return sources.map((source) => ({
      filename: source.filename,
      content: source.content,
      similarity: source.similarity,
      preview: source.content.length > 200
        ? source.content.substring(0, 200) + '...'
        : source.content,
    }))
  }
}

// 导出单例
export const ragChatService = new RAGChatService()
