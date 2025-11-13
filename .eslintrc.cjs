module.exports = {
  root: true,

  env: {
    browser: true,
    node: true,
    es2022: true,
  },

  extends: [
    '@nuxt/eslint-config',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'prettier', // 必须放最后
  ],

  parser: 'vue-eslint-parser',

  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint'],

  rules: {
    // ===================================
    // TypeScript规则
    // ===================================
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',

    // ===================================
    // Vue规则
    // ===================================
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'error',
    'vue/component-tags-order': [
      'error',
      {
        order: ['script', 'template', 'style'],
      },
    ],
    'vue/block-lang': [
      'error',
      {
        script: {
          lang: 'ts',
        },
      },
    ],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],

    // ===================================
    // 通用规则
    // ===================================
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'quote-props': ['error', 'as-needed'],

    // ===================================
    // 导入规则
    // ===================================
    'sort-imports': [
      'error',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
      },
    ],
  },

  overrides: [
    // Server端代码
    {
      files: ['server/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },

    // 测试文件
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.vue'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },

    // 配置文件
    {
      files: ['*.config.ts', '*.config.js', '*.config.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
