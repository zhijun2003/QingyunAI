import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 获取所有系统配置（管理员）
 */
export default defineEventHandler(async (event) => {
  try {
    // 验证管理员权限
    const admin = await requireRole(event, 'ADMIN')
    if (!admin) {
      return {
        success: false,
        message: '无权限',
      }
    }

    // 获取所有配置，按分组和排序
    const configs = await prisma.systemConfig.findMany({
      orderBy: [
        { group: 'asc' },
        { key: 'asc' },
      ],
    })

    // 按分组整理配置
    const groupedConfigs: Record<string, any[]> = {}
    configs.forEach((config) => {
      if (!groupedConfigs[config.group]) {
        groupedConfigs[config.group] = []
      }
      groupedConfigs[config.group].push(config)
    })

    return {
      success: true,
      data: groupedConfigs,
    }
  } catch (error) {
    console.error('Get system configs failed:', error)
    return {
      success: false,
      message: '获取系统配置失败',
    }
  }
})
