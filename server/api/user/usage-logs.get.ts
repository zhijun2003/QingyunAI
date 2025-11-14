import { prisma } from '@qingyun/database'
import { getCurrentUser } from '~/server/utils/auth'

/**
 * 获取当前用户的用量日志
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取当前用户
    const user = await getCurrentUser(event)
    if (!user) {
      return {
        success: false,
        message: '未登录',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const pageSize = Number(query.pageSize) || 20
    const modelId = query.modelId as string | undefined
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined

    // 构建查询条件
    const where: any = {
      userId: user.id,
    }

    if (modelId) {
      where.modelId = modelId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // 查询用量日志
    const [total, usageLogs] = await Promise.all([
      prisma.usageLog.count({ where }),
      prisma.usageLog.findMany({
        where,
        include: {
          model: {
            include: {
              provider: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // 查询统计信息
    const stats = await prisma.usageLog.aggregate({
      where: {
        userId: user.id,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        inputCost: true,
        outputCost: true,
        totalCost: true,
      },
      _count: true,
    })

    // 按模型统计
    const modelStats = await prisma.usageLog.groupBy({
      by: ['modelId'],
      where: {
        userId: user.id,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        totalCost: true,
      },
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: 10,
    })

    // 获取模型详情
    const modelIds = modelStats.map((s) => s.modelId)
    const models = await prisma.model.findMany({
      where: {
        id: {
          in: modelIds,
        },
      },
      include: {
        provider: {
          select: {
            displayName: true,
          },
        },
      },
    })

    const modelsMap = models.reduce((acc, model) => {
      acc[model.id] = model
      return acc
    }, {} as Record<string, any>)

    return {
      success: true,
      data: {
        usageLogs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        stats: {
          inputTokens: stats._sum.inputTokens || 0,
          outputTokens: stats._sum.outputTokens || 0,
          totalTokens: stats._sum.totalTokens || 0,
          inputCost: stats._sum.inputCost || 0,
          outputCost: stats._sum.outputCost || 0,
          totalCost: stats._sum.totalCost || 0,
          totalCount: stats._count,
          byModel: modelStats.map((stat) => ({
            modelId: stat.modelId,
            modelName: modelsMap[stat.modelId]?.displayName || '未知模型',
            providerName: modelsMap[stat.modelId]?.provider?.displayName || '',
            inputTokens: stat._sum.inputTokens || 0,
            outputTokens: stat._sum.outputTokens || 0,
            totalTokens: stat._sum.totalTokens || 0,
            totalCost: stat._sum.totalCost || 0,
            count: stat._count,
          })),
        },
      },
    }
  } catch (error) {
    console.error('Get usage logs failed:', error)
    return {
      success: false,
      message: '获取用量日志失败',
    }
  }
})
