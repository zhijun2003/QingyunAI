import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取系统统计数据（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const user = await requireRole(event, 'ADMIN')
    if (!user) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取查询参数
    const query = getQuery(event)
    const days = Number(query.days) || 30 // 默认最近30天

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 用户统计
    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: startDate,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ])

    // 收入统计
    const rechargeStats = await prisma.transaction.aggregate({
      where: {
        type: 'RECHARGE',
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    const consumptionStats = await prisma.transaction.aggregate({
      where: {
        type: 'CONSUMPTION',
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    // 对话统计
    const [totalConversations, totalMessages] = await Promise.all([
      prisma.conversation.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.message.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ])

    // Token 统计
    const tokenStats = await prisma.message.aggregate({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
    })

    // 模型使用统计（Top 10）
    const modelStats = await prisma.message.groupBy({
      by: ['modelId'],
      where: {
        createdAt: {
          gte: startDate,
        },
        modelId: {
          not: null,
        },
      },
      _count: true,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: 10,
    })

    // 获取模型详情
    const modelIds = modelStats.map((s) => s.modelId).filter(Boolean) as string[]
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

    // Provider 统计
    const providerStats = await prisma.provider.findMany({
      select: {
        id: true,
        displayName: true,
        type: true,
        isActive: true,
        _count: {
          select: {
            models: true,
            apiKeys: true,
          },
        },
      },
    })

    // 每日趋势（最近指定天数）
    const dailyStats = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const [newUsersCount, conversationsCount, rechargeAmount, consumptionAmount] =
        await Promise.all([
          prisma.user.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDate,
              },
            },
          }),
          prisma.conversation.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDate,
              },
            },
          }),
          prisma.transaction.aggregate({
            where: {
              type: 'RECHARGE',
              createdAt: {
                gte: date,
                lt: nextDate,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.transaction.aggregate({
            where: {
              type: 'CONSUMPTION',
              createdAt: {
                gte: date,
                lt: nextDate,
              },
            },
            _sum: {
              amount: true,
            },
          }),
        ])

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        newUsers: newUsersCount,
        conversations: conversationsCount,
        recharge: rechargeAmount._sum.amount || 0,
        consumption: consumptionAmount._sum.amount || 0,
      })
    }

    return {
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            new: newUsers,
          },
          revenue: {
            recharge: rechargeStats._sum.amount || 0,
            rechargeCount: rechargeStats._count,
            consumption: consumptionStats._sum.amount || 0,
            consumptionCount: consumptionStats._count,
          },
          conversations: {
            total: totalConversations,
            messages: totalMessages,
          },
          tokens: {
            input: tokenStats._sum.inputTokens || 0,
            output: tokenStats._sum.outputTokens || 0,
            cost: tokenStats._sum.cost || 0,
          },
        },
        modelStats: modelStats.map((stat) => ({
          modelId: stat.modelId,
          modelName: modelsMap[stat.modelId!]?.displayName || '未知模型',
          providerName: modelsMap[stat.modelId!]?.provider?.displayName || '',
          count: stat._count,
          inputTokens: stat._sum.inputTokens || 0,
          outputTokens: stat._sum.outputTokens || 0,
          cost: stat._sum.cost || 0,
        })),
        providerStats,
        dailyStats,
      },
    }
  } catch (error) {
    console.error('Get stats failed:', error)
    return {
      success: false,
      message: '获取统计数据失败',
    }
  }
})
