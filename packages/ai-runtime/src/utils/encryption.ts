// ==========================================
// 清云AI - 加密工具
// ==========================================
//
// AES-256-GCM 加密/解密 API 密钥
//
// Author: zhijun2003 <zhijun2003@foxmail.com>
// ==========================================

import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * 获取加密密钥（从环境变量）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置')
  }

  // 如果密钥是十六进制字符串，转换为 Buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  // 否则使用 SHA-256 哈希
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * 加密字符串
 * @param text 要加密的文本
 * @returns { encrypted: string, iv: string, tag: string }
 */
export function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

/**
 * 解密字符串
 * @param encrypted 加密后的文本
 * @param iv 初始化向量
 * @param tag 认证标签（可选，向后兼容）
 * @returns 解密后的文本
 */
export function decrypt(encrypted: string, iv: string, tag?: string): string {
  const key = getEncryptionKey()
  const ivBuffer = Buffer.from(iv, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer)

  // 如果有 tag，设置认证标签
  if (tag) {
    const tagBuffer = Buffer.from(tag, 'hex')
    decipher.setAuthTag(tagBuffer)
  }

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * 简化版：加密并返回单个字符串
 * 格式: iv:tag:encrypted
 */
export function encryptSimple(text: string): string {
  const { encrypted, iv, tag } = encrypt(text)
  return `${iv}:${tag}:${encrypted}`
}

/**
 * 简化版：从单个字符串解密
 */
export function decryptSimple(combined: string): string {
  const [iv, tag, encrypted] = combined.split(':')
  return decrypt(encrypted, iv, tag)
}

/**
 * 测试加密/解密是否正常工作
 */
export function testEncryption(): boolean {
  try {
    const testText = 'test-api-key-12345'
    const { encrypted, iv, tag } = encrypt(testText)
    const decrypted = decrypt(encrypted, iv, tag)
    return decrypted === testText
  } catch (error) {
    console.error('加密测试失败:', error)
    return false
  }
}
