/**
 * 删除文件 API
 *
 * DELETE /api/files/:id
 */

import { prisma } from '@qingyun/database'
import { getStorageService } from '~/server/services/storage/factory'

export default defineEventHandler(async (event) => {
  // 验证登录
  const session = await getUserSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      message: '请先登录'
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '缺少文件ID'
    })
  }

  try {
    // 查询文件
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    })

    if (!attachment) {
      throw createError({
        statusCode: 404,
        message: '文件不存在'
      })
    }

    // 验证权限（只能删除自己的文件）
    if (attachment.userId !== session.user.userId) {
      throw createError({
        statusCode: 403,
        message: '无权删除此文件'
      })
    }

    // 从存储服务删除文件
    const storageService = await getStorageService()
    await storageService.delete(attachment.storagePath)

    // 从数据库删除记录
    await prisma.attachment.delete({
      where: { id }
    })

    return {
      success: true,
      message: '文件删除成功'
    }
  } catch (error: any) {
    console.error('文件删除失败:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '文件删除失败'
    })
  }
})
