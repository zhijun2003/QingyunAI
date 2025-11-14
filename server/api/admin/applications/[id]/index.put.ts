import { prisma } from '@qingyun/database'
import { requireRole } from '~/server/utils/auth'

/**
 * 更新应用配置（管理员）
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

    // 获取应用ID
    const id = getRouterParam(event, 'id')
    if (!id) {
      return {
        success: false,
        message: '应用ID不能为空',
      }
    }

    // 检查应用是否存在
    const existingApp = await prisma.application.findUnique({
      where: { id },
    })

    if (!existingApp) {
      return {
        success: false,
        message: '应用不存在',
      }
    }

    // 获取请求体
    const body = await readBody(event)
    const {
      displayName,
      description,
      icon,
      menuLabel,
      menuIcon,
      sortOrder,
      isEnabled,
      isVisible,
      maxUsagePerDay,
      tags,
      metadata,
    } = body

    // 核心应用不允许禁用
    if (existingApp.isCore && isEnabled === false) {
      return {
        success: false,
        message: '核心应用不能禁用',
      }
    }

    // 构建更新数据
    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (menuLabel !== undefined) updateData.menuLabel = menuLabel
    if (menuIcon !== undefined) updateData.menuIcon = menuIcon
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled
    if (isVisible !== undefined) updateData.isVisible = isVisible
    if (maxUsagePerDay !== undefined) updateData.maxUsagePerDay = maxUsagePerDay
    if (tags !== undefined) updateData.tags = tags
    if (metadata !== undefined) updateData.metadata = metadata

    // 更新应用
    const application = await prisma.application.update({
      where: { id },
      data: updateData,
    })

    return {
      success: true,
      data: application,
      message: '应用更新成功',
    }
  } catch (error) {
    console.error('Update application failed:', error)
    return {
      success: false,
      message: '更新应用失败',
    }
  }
})
