/**
 * 删除知识库
 * DELETE /api/knowledge-bases/:id
 */

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const userId = session.user.userId
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: '缺少知识库ID' })
  }

  try {
    // 检查知识库是否存在并验证权限
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
    })

    if (!knowledgeBase) {
      throw createError({ statusCode: 404, message: '知识库不存在' })
    }

    if (knowledgeBase.userId !== userId) {
      throw createError({ statusCode: 403, message: '无权删除此知识库' })
    }

    // 删除知识库（级联删除文档和文档块）
    await prisma.knowledgeBase.delete({
      where: { id },
    })

    return {
      success: true,
      message: '知识库删除成功',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('删除知识库失败:', error)
    throw createError({
      statusCode: 500,
      message: '删除知识库失败',
    })
  }
})
