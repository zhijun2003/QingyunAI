// ==========================================
// 获取用户列表 API（管理员）
// ==========================================
//
// GET /api/admin/users
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import { prisma } from '@qingyun/database'
import { getCurrentUser, requireRole } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = getCurrentUser(event)
    requireRole(currentUser, 'ADMIN')

    const query = getQuery(event)

    // 构建查询条件
    const where: any = {}

    // 按角色筛选
    if (query.role) {
      where.role = query.role as string
    }

    // 按状态筛选
    if (query.status) {
      where.status = query.status as string
    }

    // 搜索（用户名、邮箱、手机号、昵称）
    if (query.search) {
      where.OR = [
        { username: { contains: query.search as string } },
        { email: { contains: query.search as string } },
        { phone: { contains: query.search as string } },
        { nickname: { contains: query.search as string } }
      ]
    }

    // 分页参数
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 20
    const skip = (page - 1) * pageSize

    // 获取用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          nickname: true,
          avatar: true,
          role: true,
          status: true,
          balance: true,
          freeQuota: true,
          totalSpent: true,
          totalTokens: true,
          createdAt: true,
          lastLoginAt: true
          // 不返回密码
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.user.count({ where })
    ])

    return {
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: `获取用户列表失败: ${error.message}`
    })
  }
})
