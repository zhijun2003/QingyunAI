import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        '.nuxt/',
        '.output/',
        'dist/',
      ],
      // 目标：80%覆盖率
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },

    // 测试文件匹配
    include: ['**/*.{test,spec}.{js,ts}'],

    // 测试超时
    testTimeout: 10000,
  },

  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
