import { getSystemConfig } from '~/server/utils/config'

/**
 * 获取用户可见的系统配置
 */
export default defineEventHandler(async () => {
  try {
    const [rechargeConfig, paymentConfig] = await Promise.all([
      getSystemConfig('recharge'),
      getSystemConfig('payment'),
    ])

    return {
      success: true,
      data: {
        recharge: rechargeConfig,
        payment: paymentConfig,
      },
    }
  } catch (error) {
    console.error('Get user config failed:', error)
    return {
      success: false,
      message: '获取配置失败',
    }
  }
})
