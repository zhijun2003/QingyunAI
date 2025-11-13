module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Type类型（必须）
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复bug
        'docs', // 文档变更
        'style', // 代码格式（不影响代码运行）
        'refactor', // 重构（既不是新增功能，也不是修复bug）
        'perf', // 性能优化
        'test', // 增加测试
        'chore', // 构建过程或辅助工具的变动
        'revert', // 回退
        'build', // 打包
        'ci', // CI配置
        'wip', // 开发中
        'billing', // 计费相关（自定义）
      ],
    ],

    // Scope范围（可选，但推荐）
    'scope-enum': [
      2,
      'always',
      [
        'auth', // 认证
        'chat', // 对话
        'billing', // 计费
        'knowledge', // 知识库
        'agent', // 智能体
        'plugin', // 插件
        'model', // 模型
        'admin', // 管理后台
        'ui', // UI组件
        'db', // 数据库
        'api', // API
        'deploy', // 部署
        'config', // 配置
        'deps', // 依赖
        'mcp', // MCP
        'builder', // 微页面构建器
      ],
    ],

    // 其他规则
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-case': [0], // 不限制subject大小写
    'header-max-length': [2, 'always', 100],
  },
}
