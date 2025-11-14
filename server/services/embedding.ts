/**
 * 向量化服务
 *
 * 使用 AI SDK 的 embed() 和 embedMany() 进行文本向量化
 */

import { embed, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

/**
 * 向量化服务
 */
export class EmbeddingService {
  private model = openai.embedding('text-embedding-3-small')

  /**
   * 单个文本向量化
   *
   * @param text 文本内容
   * @returns 1536维向量
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: this.model,
        value: text
      })

      return embedding
    } catch (error: any) {
      throw new Error(`向量化失败: ${error.message}`)
    }
  }

  /**
   * 批量文本向量化
   *
   * @param texts 文本数组
   * @returns 向量数组
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const { embeddings } = await embedMany({
        model: this.model,
        values: texts
      })

      return embeddings
    } catch (error: any) {
      throw new Error(`批量向量化失败: ${error.message}`)
    }
  }
}

// 导出单例
export const embeddingService = new EmbeddingService()
