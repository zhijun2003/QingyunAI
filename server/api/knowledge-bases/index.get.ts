/**
 * 获取知识库列表
 * GET /api/knowledge-bases
 */

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const userId = session.user.userId

  // 获取查询参数
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const search = (query.search as string) || ''
  const isActive = query.isActive === 'false' ? false : query.isActive === 'true' ? true : undefined

  // 构建查询条件
  const where: any = {
    userId,
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  try {
    // 获取总数
    const total = await prisma.knowledgeBase.count({ where })

    // 获取列表
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { documents: true },
        },
      },
    })

    return {
      success: true,
      data: {
        list: knowledgeBases,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error: any) {
    console.error('获取知识库列表失败:', error)
    throw createError({
      statusCode: 500,
      message: '获取知识库列表失败',
    })
  }
})
