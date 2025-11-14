/**
 * 删除知识库中的文档
 * DELETE /api/knowledge-bases/:id/documents/:docId
 */

import { prisma } from '@qingyun/database'
import { getStorageService } from '~/server/services/storage/factory'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const userId = session.user.userId
  const knowledgeBaseId = getRouterParam(event, 'id')
  const docId = getRouterParam(event, 'docId')

  if (!knowledgeBaseId || !docId) {
    throw createError({ statusCode: 400, message: '缺少必要参数' })
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

    // 获取文档信息
    const document = await prisma.document.findUnique({
      where: { id: docId },
    })

    if (!document) {
      throw createError({ statusCode: 404, message: '文档不存在' })
    }

    if (document.knowledgeBaseId !== knowledgeBaseId) {
      throw createError({ statusCode: 403, message: '文档不属于此知识库' })
    }

    // 从存储服务删除文件
    try {
      const storageService = await getStorageService()
      // 从 fileUrl 提取 storagePath
      const url = new URL(document.fileUrl)
      const storagePath = url.pathname.substring(1) // 移除开头的 /
      await storageService.delete(storagePath)
    } catch (error) {
      console.error('删除文件失败:', error)
      // 继续删除数据库记录，即使文件删除失败
    }

    // 删除文档（级联删除文档块）
    await prisma.document.delete({
      where: { id: docId },
    })

    // 更新知识库统计
    const stats = await prisma.document.aggregate({
      where: { knowledgeBaseId },
      _count: true,
      _sum: { chunkCount: true },
    })

    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        documentCount: stats._count,
        chunkCount: stats._sum.chunkCount || 0,
      },
    })

    return {
      success: true,
      message: '文档删除成功',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('删除文档失败:', error)
    throw createError({
      statusCode: 500,
      message: '删除文档失败',
    })
  }
})
