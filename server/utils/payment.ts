import AlipaySdk from 'alipay-sdk'
import AlipayFormData from 'alipay-sdk/lib/form'
import { Payment } from 'wechatpay-node-v3'
import { getSystemConfig } from './config'

/**
 * 支付渠道类型
 */
export type PaymentChannel = 'pc' | 'mobile'

/**
 * 支付宝配置
 */
interface AlipayConfig {
  appId: string
  privateKey: string
  alipayPublicKey: string
  gateway: string
}

/**
 * 微信支付配置
 */
interface WechatConfig {
  appId: string
  mchId: string
  apiKey: string
}

/**
 * 获取支付宝配置
 */
async function getAlipayConfig(): Promise<AlipayConfig | null> {
  try {
    const config = await getSystemConfig('payment')

    if (config['alipay.enabled'] !== 'true') {
      return null
    }

    const appId = config['alipay.app_id']
    const privateKey = config['alipay.private_key']
    const alipayPublicKey = config['alipay.public_key']
    const gateway = config['alipay.gateway'] || 'https://openapi.alipay.com/gateway.do'

    if (!appId || !privateKey || !alipayPublicKey) {
      console.error('Alipay configuration incomplete')
      return null
    }

    return {
      appId,
      privateKey,
      alipayPublicKey,
      gateway,
    }
  } catch (error) {
    console.error('Failed to get Alipay config:', error)
    return null
  }
}

/**
 * 获取微信支付配置
 */
async function getWechatConfig(): Promise<WechatConfig | null> {
  try {
    const config = await getSystemConfig('payment')

    if (config['wechat.enabled'] !== 'true') {
      return null
    }

    const appId = config['wechat.app_id']
    const mchId = config['wechat.mch_id']
    const apiKey = config['wechat.api_key']

    if (!appId || !mchId || !apiKey) {
      console.error('WeChat Pay configuration incomplete')
      return null
    }

    return {
      appId,
      mchId,
      apiKey,
    }
  } catch (error) {
    console.error('Failed to get WeChat Pay config:', error)
    return null
  }
}

/**
 * 支付宝 - 创建支付订单
 */
export async function createAlipayOrder(params: {
  orderNo: string
  subject: string
  totalAmount: number // 单位：元
  channel: PaymentChannel
  returnUrl?: string
  notifyUrl: string
}): Promise<{ success: boolean; data?: string; message?: string }> {
  try {
    const config = await getAlipayConfig()
    if (!config) {
      return {
        success: false,
        message: '支付宝支付未配置或未启用',
      }
    }

    // 初始化SDK
    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.privateKey,
      alipayPublicKey: config.alipayPublicKey,
      gateway: config.gateway,
    })

    const formData = new AlipayFormData()
    formData.setMethod('get')

    // PC端使用扫码支付，移动端使用手机网站支付
    const method = params.channel === 'pc'
      ? 'alipay.trade.page.pay'
      : 'alipay.trade.wap.pay'

    formData.addField('notifyUrl', params.notifyUrl)
    if (params.returnUrl) {
      formData.addField('returnUrl', params.returnUrl)
    }

    formData.addField('bizContent', {
      outTradeNo: params.orderNo,
      productCode: params.channel === 'pc' ? 'FAST_INSTANT_TRADE_PAY' : 'QUICK_WAP_WAY',
      subject: params.subject,
      totalAmount: params.totalAmount.toFixed(2),
    })

    const result = await alipaySdk.exec(method, {}, { formData })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Create Alipay order failed:', error)
    return {
      success: false,
      message: '创建支付宝订单失败',
    }
  }
}

/**
 * 支付宝 - 验证回调签名
 */
export async function verifyAlipayCallback(params: Record<string, any>): Promise<boolean> {
  try {
    const config = await getAlipayConfig()
    if (!config) {
      return false
    }

    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.privateKey,
      alipayPublicKey: config.alipayPublicKey,
      gateway: config.gateway,
    })

    return alipaySdk.checkNotifySign(params)
  } catch (error) {
    console.error('Verify Alipay callback failed:', error)
    return false
  }
}

/**
 * 微信支付 - 创建支付订单
 */
export async function createWechatOrder(params: {
  orderNo: string
  description: string
  totalAmount: number // 单位：元
  channel: PaymentChannel
  notifyUrl: string
  clientIp?: string
}): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const config = await getWechatConfig()
    if (!config) {
      return {
        success: false,
        message: '微信支付未配置或未启用',
      }
    }

    const payment = new Payment({
      appid: config.appId,
      mchid: config.mchId,
      private_key: config.apiKey,
    })

    // PC端使用Native支付（扫码），移动端使用H5支付
    const tradeType = params.channel === 'pc' ? 'NATIVE' : 'MWEB'

    const orderParams: any = {
      appid: config.appId,
      mchid: config.mchId,
      description: params.description,
      out_trade_no: params.orderNo,
      notify_url: params.notifyUrl,
      amount: {
        total: Math.round(params.totalAmount * 100), // 转换为分
        currency: 'CNY',
      },
    }

    if (tradeType === 'MWEB') {
      orderParams.scene_info = {
        payer_client_ip: params.clientIp || '127.0.0.1',
        h5_info: {
          type: 'Wap',
        },
      }
    }

    let result
    if (tradeType === 'NATIVE') {
      result = await payment.native(orderParams)
    } else {
      result = await payment.h5(orderParams)
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Create WeChat Pay order failed:', error)
    return {
      success: false,
      message: '创建微信支付订单失败',
    }
  }
}

/**
 * 微信支付 - 验证回调签名
 */
export async function verifyWechatCallback(
  signature: string,
  timestamp: string,
  nonce: string,
  body: string
): Promise<boolean> {
  try {
    const config = await getWechatConfig()
    if (!config) {
      return false
    }

    const payment = new Payment({
      appid: config.appId,
      mchid: config.mchId,
      private_key: config.apiKey,
    })

    return payment.verifySign({
      signature,
      timestamp,
      nonce,
      body,
    })
  } catch (error) {
    console.error('Verify WeChat Pay callback failed:', error)
    return false
  }
}

/**
 * 支付宝 - 查询订单状态
 */
export async function queryAlipayOrder(orderNo: string): Promise<{
  success: boolean
  data?: any
  message?: string
}> {
  try {
    const config = await getAlipayConfig()
    if (!config) {
      return {
        success: false,
        message: '支付宝支付未配置或未启用',
      }
    }

    const alipaySdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.privateKey,
      alipayPublicKey: config.alipayPublicKey,
      gateway: config.gateway,
    })

    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        outTradeNo: orderNo,
      },
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Query Alipay order failed:', error)
    return {
      success: false,
      message: '查询支付宝订单失败',
    }
  }
}

/**
 * 微信支付 - 查询订单状态
 */
export async function queryWechatOrder(orderNo: string): Promise<{
  success: boolean
  data?: any
  message?: string
}> {
  try {
    const config = await getWechatConfig()
    if (!config) {
      return {
        success: false,
        message: '微信支付未配置或未启用',
      }
    }

    const payment = new Payment({
      appid: config.appId,
      mchid: config.mchId,
      private_key: config.apiKey,
    })

    const result = await payment.getTransactionByOutTradeNo(orderNo)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Query WeChat Pay order failed:', error)
    return {
      success: false,
      message: '查询微信支付订单失败',
    }
  }
}
