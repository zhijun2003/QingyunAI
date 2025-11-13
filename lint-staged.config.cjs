module.exports = {
  // TypeScript和Vue文件
  '*.{ts,tsx,vue}': ['eslint --fix', 'prettier --write'],

  // JavaScript和配置文件
  '*.{js,cjs,mjs}': ['eslint --fix', 'prettier --write'],

  // JSON和Markdown
  '*.{json,md,mdx}': ['prettier --write'],

  // Prisma Schema
  'prisma/schema.prisma': ['prisma format', 'prisma validate'],

  // 样式文件
  '*.{css,scss,vue}': ['prettier --write'],
}
