/**
 * 获取知识库详情
 * GET /api/knowledge-bases/:id
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
    // 获取知识库详情
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { chunks: true },
            },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
    })

    if (!knowledgeBase) {
      throw createError({ statusCode: 404, message: '知识库不存在' })
    }

    // 验证权限
    if (knowledgeBase.userId !== userId) {
      throw createError({ statusCode: 403, message: '无权访问此知识库' })
    }

    return {
      success: true,
      data: knowledgeBase,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('获取知识库详情失败:', error)
    throw createError({
      statusCode: 500,
      message: '获取知识库详情失败',
    })
  }
})
