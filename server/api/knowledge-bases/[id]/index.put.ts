/**
 * 更新知识库
 * PUT /api/knowledge-bases/:id
 */

import { prisma } from '@qingyun/database'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1, '知识库名称不能为空').max(100, '知识库名称不能超过100个字符').optional(),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  icon: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})

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

  // 验证请求体
  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message,
    })
  }

  try {
    // 检查知识库是否存在并验证权限
    const existingKnowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
    })

    if (!existingKnowledgeBase) {
      throw createError({ statusCode: 404, message: '知识库不存在' })
    }

    if (existingKnowledgeBase.userId !== userId) {
      throw createError({ statusCode: 403, message: '无权修改此知识库' })
    }

    // 更新知识库
    const knowledgeBase = await prisma.knowledgeBase.update({
      where: { id },
      data: result.data,
    })

    return {
      success: true,
      message: '知识库更新成功',
      data: knowledgeBase,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('更新知识库失败:', error)
    throw createError({
      statusCode: 500,
      message: '更新知识库失败',
    })
  }
})
