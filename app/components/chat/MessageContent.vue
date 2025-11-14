<template>
  <div class="message-content">
    <!-- Markdown 渲染的内容 -->
    <div ref="contentRef" class="markdown-body" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import mermaid from 'mermaid'

const props = defineProps<{
  content: string
}>()

const message = useMessage()
const contentRef = ref<HTMLElement | null>(null)

// 渲染 Markdown
const renderedContent = computed(() => {
  return renderMarkdown(props.content)
})

// 初始化 Mermaid
onMounted(() => {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
  })
})

// 渲染 Mermaid 图表和添加复制按钮
watch(
  () => props.content,
  async () => {
    await nextTick()
    if (!contentRef.value) return

    // 渲染 Mermaid 图表
    const mermaidBlocks = contentRef.value.querySelectorAll('code.language-mermaid')
    mermaidBlocks.forEach(async (block, index) => {
      try {
        const code = block.textContent || ''
        const { svg } = await mermaid.render(`mermaid-${Date.now()}-${index}`, code)
        const container = document.createElement('div')
        container.className = 'mermaid-container'
        container.innerHTML = svg
        block.parentElement?.replaceWith(container)
      } catch (err) {
        console.error('Mermaid render error:', err)
      }
    })

    // 为代码块添加复制按钮
    const codeBlocks = contentRef.value.querySelectorAll('pre.hljs')
    codeBlocks.forEach((block) => {
      // 检查是否已经添加过复制按钮
      if (block.querySelector('.copy-btn')) return

      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn'
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `
      copyBtn.title = '复制代码'

      copyBtn.addEventListener('click', async () => {
        const code = block.querySelector('code')?.textContent || ''
        try {
          await navigator.clipboard.writeText(code)
          copyBtn.classList.add('copied')
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `
          message.success('代码已复制')
          setTimeout(() => {
            copyBtn.classList.remove('copied')
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `
          }, 2000)
        } catch (err) {
          console.error('Copy failed:', err)
          message.error('复制失败')
        }
      })

      // 设置相对定位以便定位复制按钮
      if (block instanceof HTMLElement) {
        block.style.position = 'relative'
      }
      block.appendChild(copyBtn)
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.message-content {
  width: 100%;
  overflow-x: auto;
}

/* Markdown 基础样式 */
.markdown-body {
  font-size: 15px;
  line-height: 1.6;
  color: #24292e;
  word-wrap: break-word;
}

/* 标题样式 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-body :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-body :deep(h3) {
  font-size: 1.25em;
}

/* 段落和列表 */
.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 10px;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

/* 链接样式 */
.markdown-body :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* 代码样式 */
.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

/* 代码块复制按钮 */
.markdown-body :deep(pre.hljs) {
  position: relative;
}

.markdown-body :deep(.copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #d0d7de;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.markdown-body :deep(pre.hljs:hover .copy-btn) {
  opacity: 1;
}

.markdown-body :deep(.copy-btn:hover) {
  background: rgba(255, 255, 255, 1);
}

.markdown-body :deep(.copy-btn.copied) {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.markdown-body :deep(.copy-btn svg) {
  display: block;
}

/* 引用样式 */
.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 0 0 16px 0;
}

.markdown-body :deep(blockquote > :first-child) {
  margin-top: 0;
}

.markdown-body :deep(blockquote > :last-child) {
  margin-bottom: 0;
}

/* 表格样式 */
.markdown-body :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-body :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

/* 水平线 */
.markdown-body :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* 图片样式 */
.markdown-body :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
  background-color: #fff;
}

/* Mermaid 容器 */
.markdown-body :deep(.mermaid-container) {
  margin: 16px 0;
  padding: 16px;
  background-color: #f6f8fa;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-body :deep(.mermaid-container svg) {
  max-width: 100%;
  height: auto;
}

/* KaTeX 数学公式样式 */
.markdown-body :deep(.katex) {
  font-size: 1.1em;
}

.markdown-body :deep(.katex-display) {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
