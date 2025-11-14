/**
 * 文档解析服务
 *
 * 支持的文档类型：
 * - PDF (.pdf)
 * - Word (.doc, .docx)
 * - Excel (.xls, .xlsx, .csv)
 * - 纯文本 (.txt)
 * - Markdown (.md)
 */

import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

/**
 * 文档解析结果
 */
export interface ParseResult {
  text: string
  metadata?: {
    pages?: number
    title?: string
    author?: string
    [key: string]: any
  }
}

/**
 * 文档解析服务
 */
export class DocumentParserService {
  /**
   * 解析文档
   *
   * @param buffer 文档缓冲区
   * @param fileType 文件类型
   * @returns 解析结果
   */
  async parse(buffer: Buffer, fileType: string): Promise<ParseResult> {
    const ext = fileType.toLowerCase()

    switch (ext) {
      case 'pdf':
        return await this.parsePDF(buffer)

      case 'doc':
      case 'docx':
        return await this.parseWord(buffer)

      case 'xls':
      case 'xlsx':
      case 'csv':
        return await this.parseExcel(buffer)

      case 'txt':
        return await this.parseText(buffer)

      case 'md':
      case 'markdown':
        return await this.parseMarkdown(buffer)

      default:
        throw new Error(`不支持的文件类型: ${fileType}`)
    }
  }

  /**
   * 解析 PDF
   */
  private async parsePDF(buffer: Buffer): Promise<ParseResult> {
    try {
      const data = await pdfParse(buffer)

      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author
        }
      }
    } catch (error: any) {
      throw new Error(`PDF 解析失败: ${error.message}`)
    }
  }

  /**
   * 解析 Word
   */
  private async parseWord(buffer: Buffer): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ buffer })

      return {
        text: result.value,
        metadata: {}
      }
    } catch (error: any) {
      throw new Error(`Word 解析失败: ${error.message}`)
    }
  }

  /**
   * 解析 Excel
   */
  private async parseExcel(buffer: Buffer): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let text = ''

      // 遍历所有工作表
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName]

        // 转换为 CSV 格式
        const csv = XLSX.utils.sheet_to_csv(sheet)
        text += `\n\n=== ${sheetName} ===\n\n${csv}`
      })

      return {
        text: text.trim(),
        metadata: {
          sheets: workbook.SheetNames.length
        }
      }
    } catch (error: any) {
      throw new Error(`Excel 解析失败: ${error.message}`)
    }
  }

  /**
   * 解析纯文本
   */
  private async parseText(buffer: Buffer): Promise<ParseResult> {
    try {
      const text = buffer.toString('utf-8')

      return {
        text,
        metadata: {}
      }
    } catch (error: any) {
      throw new Error(`文本解析失败: ${error.message}`)
    }
  }

  /**
   * 解析 Markdown
   */
  private async parseMarkdown(buffer: Buffer): Promise<ParseResult> {
    try {
      const text = buffer.toString('utf-8')

      return {
        text,
        metadata: {}
      }
    } catch (error: any) {
      throw new Error(`Markdown 解析失败: ${error.message}`)
    }
  }
}

// 导出单例
export const documentParser = new DocumentParserService()
