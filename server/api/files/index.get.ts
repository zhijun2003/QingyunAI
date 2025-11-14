/**
 * 获取文件列表 API
 *
 * GET /api/files
 *
 * Query参数：
 * - page: 页码（默认 1）
 * - limit: 每页数量（默认 20）
 * - mimeType: 文件类型筛选（可选）
 */

import { prisma } from '@qingyun/database'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      message: '请先登录'
    })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20
  const mimeType = query.mimeType as string | undefined

  // 构建查询条件
  const where: any = {
    userId: session.user.userId
  }

  if (mimeType) {
    where.mimeType = {
      startsWith: mimeType
    }
  }

  // 查询文件列表
  const [files, total] = await Promise.all([
    prisma.attachment.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        url: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        uploadStatus: true,
        createdAt: true
      }
    }),
    prisma.attachment.count({ where })
  ])

  return {
    success: true,
    data: {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
})
