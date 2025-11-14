/**
 * 文档分块服务
 *
 * 将长文档分割成多个小块（chunks），以便于向量化和检索
 */

/**
 * 文档块
 */
export interface DocumentChunk {
  content: string
  index: number
  metadata?: {
    startChar?: number
    endChar?: number
    [key: string]: any
  }
}

/**
 * 分块配置
 */
export interface ChunkOptions {
  chunkSize?: number // 每块大小（字符数）
  chunkOverlap?: number // 重叠大小（字符数）
  separators?: string[] // 分隔符（按优先级）
}

/**
 * 文档分块服务
 */
export class DocumentChunkerService {
  /**
   * 分块文档
   *
   * @param text 文档文本
   * @param options 分块配置
   * @returns 文档块数组
   */
  chunk(text: string, options: ChunkOptions = {}): DocumentChunk[] {
    const {
      chunkSize = 1000,
      chunkOverlap = 200,
      separators = ['\n\n', '\n', '。', '！', '？', '. ', '! ', '? ']
    } = options

    // 如果文本长度小于块大小，直接返回一个块
    if (text.length <= chunkSize) {
      return [
        {
          content: text,
          index: 0,
          metadata: {
            startChar: 0,
            endChar: text.length
          }
        }
      ]
    }

    const chunks: DocumentChunk[] = []
    let startChar = 0
    let chunkIndex = 0

    while (startChar < text.length) {
      // 计算当前块的结束位置
      let endChar = startChar + chunkSize

      // 如果到达文本末尾
      if (endChar >= text.length) {
        endChar = text.length
      } else {
        // 尝试在分隔符处分割
        const splitPoint = this.findSplitPoint(
          text,
          startChar,
          endChar,
          separators
        )

        if (splitPoint !== -1) {
          endChar = splitPoint
        }
      }

      // 提取当前块
      const content = text.substring(startChar, endChar).trim()

      if (content.length > 0) {
        chunks.push({
          content,
          index: chunkIndex++,
          metadata: {
            startChar,
            endChar
          }
        })
      }

      // 计算下一块的起始位置（考虑重叠）
      startChar = endChar - chunkOverlap

      // 确保不会回退
      if (startChar <= chunks[chunks.length - 1]?.metadata?.startChar || 0) {
        startChar = endChar
      }
    }

    return chunks
  }

  /**
   * 查找最佳分割点
   *
   * @param text 文本
   * @param start 起始位置
   * @param end 结束位置
   * @param separators 分隔符列表
   * @returns 分割点位置（-1 表示未找到）
   */
  private findSplitPoint(
    text: string,
    start: number,
    end: number,
    separators: string[]
  ): number {
    // 在结束位置附近搜索分隔符
    const searchRange = 100 // 向前搜索100个字符

    for (const separator of separators) {
      for (let i = end; i >= Math.max(start, end - searchRange); i--) {
        if (text.substring(i, i + separator.length) === separator) {
          return i + separator.length
        }
      }
    }

    return -1
  }
}

// 导出单例
export const documentChunker = new DocumentChunkerService()
