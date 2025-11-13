module.exports = {
  // 基础配置
  semi: false,              // 不使用分号
  singleQuote: true,        // 使用单引号
  trailingComma: 'es5',     // ES5风格尾逗号
  printWidth: 100,          // 行宽100
  tabWidth: 2,              // 缩进2空格
  useTabs: false,           // 不使用tab

  // 箭头函数
  arrowParens: 'always',    // 箭头函数总是使用括号

  // 换行符
  endOfLine: 'lf',          // 使用LF（Unix风格）

  // Vue特定
  vueIndentScriptAndStyle: false,  // <script>和<style>不额外缩进

  // HTML
  htmlWhitespaceSensitivity: 'ignore',

  // 括号
  bracketSpacing: true,     // 对象字面量括号内有空格
  bracketSameLine: false,   // 多行HTML元素>独占一行
}
