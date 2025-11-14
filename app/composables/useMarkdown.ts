import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
// @ts-expect-error - markdown-it-katex 没有类型定义
import katex from 'markdown-it-katex'

let mdInstance: MarkdownIt | null = null

/**
 * 获取 Markdown 渲染器实例（单例模式）
 */
export function useMarkdown() {
  if (!mdInstance) {
    // 初始化 markdown-it
    mdInstance = new MarkdownIt({
      html: false, // 不允许 HTML 标签（安全考虑）
      linkify: true, // 自动识别链接
      typographer: true, // 启用智能引号等排版优化
      breaks: true, // 将 \n 转换为 <br>
      highlight: (str, lang) => {
        // 代码高亮
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
          } catch (err) {
            console.error('Highlight error:', err)
          }
        }
        // 使用默认的转义
        return `<pre class="hljs"><code>${mdInstance!.utils.escapeHtml(str)}</code></pre>`
      },
    })

    // 添加 KaTeX 插件支持数学公式
    mdInstance.use(katex, {
      throwOnError: false,
      errorColor: '#cc0000',
    })

    // 自定义链接渲染（在新窗口打开外部链接）
    const defaultRender =
      mdInstance.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options)
      }

    mdInstance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const hrefIndex = tokens[idx].attrIndex('href')
      if (hrefIndex >= 0 && tokens[idx].attrs) {
        const href = tokens[idx].attrs[hrefIndex][1]
        // 外部链接在新窗口打开
        if (href.startsWith('http://') || href.startsWith('https://')) {
          tokens[idx].attrPush(['target', '_blank'])
          tokens[idx].attrPush(['rel', 'noopener noreferrer'])
        }
      }
      return defaultRender(tokens, idx, options, env, self)
    }
  }

  return mdInstance
}

/**
 * 渲染 Markdown 文本为 HTML
 */
export function renderMarkdown(content: string): string {
  const md = useMarkdown()
  return md.render(content)
}
