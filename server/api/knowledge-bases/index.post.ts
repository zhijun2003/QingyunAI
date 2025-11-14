/**
 * 创建知识库
 * POST /api/knowledge-bases
 */

import { prisma } from '@qingyun/database'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, '知识库名称不能为空').max(100, '知识库名称不能超过100个字符'),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  icon: z.string().max(200).optional(),
  embeddingModel: z.string().default('text-embedding-3-small'),
})

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  const userId = session.user.userId

  // 验证请求体
  const body = await readBody(event)
  const result = createSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0].message,
    })
  }

  const { name, description, icon, embeddingModel } = result.data

  try {
    // 创建知识库
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        userId,
        name,
        description,
        icon,
        embeddingModel,
      },
    })

    return {
      success: true,
      message: '知识库创建成功',
      data: knowledgeBase,
    }
  } catch (error: any) {
    console.error('创建知识库失败:', error)
    throw createError({
      statusCode: 500,
      message: '创建知识库失败',
    })
  }
})
